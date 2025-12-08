import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PRO-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");
    
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID is required");
    
    logStep("Verifying session", { sessionId });
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }
    
    logStep("Payment verified", { paymentStatus: session.payment_status });
    
    // Parse metadata
    const metadata = session.metadata || {};
    const plan = metadata.plan;
    const employeeCount = parseInt(metadata.employee_count || "30");
    const companyData = JSON.parse(metadata.company_data || "{}");
    const addons = JSON.parse(metadata.addons || "{}");
    
    logStep("Metadata parsed", { plan, employeeCount, companyData: Object.keys(companyData) });
    
    // Get or create user
    let userId = metadata.user_id;
    
    if (!userId && session.customer_email) {
      // Check if user exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === session.customer_email);
      
      if (existingUser) {
        userId = existingUser.id;
        logStep("Found existing user", { userId });
      }
    }
    
    if (!userId) {
      throw new Error("User ID not found");
    }
    
    // Create company
    const { data: company, error: companyError } = await supabaseAdmin
      .from("pro_companies")
      .insert({
        name: companyData.name || "Ma Société",
        legal_name: companyData.legal_name || companyData.name,
        siret: companyData.siret,
        sector: companyData.sector,
        contact_name: companyData.contact_name,
        contact_email: companyData.contact_email || session.customer_email,
        contact_phone: companyData.contact_phone,
        address: companyData.address,
        postal_code: companyData.postal_code,
        city: companyData.city,
        plan_type: plan,
        max_employees: employeeCount,
        copilot_enabled: plan !== "pro" || addons.copilot,
        enable_geofencing: plan !== "pro" || addons.geofencing,
        require_face_recognition_default: plan !== "pro" || addons.face_recognition,
        enable_webhook: plan === "collectivite" || (plan === "entreprise" && addons.webhooks),
        subscription_id: session.subscription as string,
        is_verified: true,
        is_active: true,
      })
      .select()
      .single();
    
    if (companyError) {
      logStep("Error creating company", { error: companyError.message });
      throw companyError;
    }
    
    logStep("Company created", { companyId: company.id });
    
    // Assign owner role
    const { error: roleError } = await supabaseAdmin
      .from("pro_company_roles")
      .insert({
        company_id: company.id,
        user_id: userId,
        role: "owner",
      });
    
    if (roleError) {
      logStep("Error assigning role", { error: roleError.message });
      // Don't throw, company is created
    }
    
    logStep("Owner role assigned");
    
    return new Response(JSON.stringify({ 
      success: true, 
      companyId: company.id,
      plan,
      employeeCount
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
