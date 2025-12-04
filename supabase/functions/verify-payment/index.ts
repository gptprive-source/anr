import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Use service role for database operations
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    console.log("[VERIFY-PAYMENT] Starting payment verification");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    console.log("[VERIFY-PAYMENT] User authenticated:", user.id);

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID is required");
    console.log("[VERIFY-PAYMENT] Session ID:", sessionId);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });
    console.log("[VERIFY-PAYMENT] Session status:", session.status, "Payment status:", session.payment_status);

    if (session.status !== "complete" || session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    // Check if user matches
    if (session.metadata?.user_id !== user.id) {
      throw new Error("User mismatch");
    }

    // Extract metadata
    const metadata = session.metadata!;
    const address = metadata.address;
    const latitude = parseFloat(metadata.latitude);
    const longitude = parseFloat(metadata.longitude);
    const habitationName = metadata.habitation_name;
    const isNewAnr = metadata.is_new_anr === "true";
    const extraDomings = parseInt(metadata.extra_domings) || 0;
    const existingAnrId = metadata.existing_anr_id || null;

    console.log("[VERIFY-PAYMENT] Creating ANR/habitation:", { isNewAnr, habitationName, extraDomings });

    let anrId: string;

    // Create or get ANR
    if (isNewAnr) {
      const anrCode = `ANR-${Date.now().toString(36).toUpperCase()}`;
      const { data: newAnr, error: anrError } = await supabaseAdmin
        .from("anrs")
        .insert({
          code: anrCode,
          address,
          latitude,
          longitude,
        })
        .select("id")
        .single();

      if (anrError) throw new Error(`Error creating ANR: ${anrError.message}`);
      anrId = newAnr.id;
      console.log("[VERIFY-PAYMENT] New ANR created:", anrId);
    } else {
      if (!existingAnrId) throw new Error("Existing ANR ID is required");
      anrId = existingAnrId;
      console.log("[VERIFY-PAYMENT] Using existing ANR:", anrId);
    }

    // Create habitation
    const { data: habitation, error: habError } = await supabaseAdmin
      .from("habitations")
      .insert({
        anr_id: anrId,
        name: habitationName,
      })
      .select("id")
      .single();

    if (habError) throw new Error(`Error creating habitation: ${habError.message}`);
    console.log("[VERIFY-PAYMENT] Habitation created:", habitation.id);

    // Create resident as owner
    const { error: resError } = await supabaseAdmin
      .from("residents")
      .insert({
        habitation_id: habitation.id,
        user_id: user.id,
        is_owner: true,
        status: "verified",
      });

    if (resError) throw new Error(`Error creating resident: ${resError.message}`);
    console.log("[VERIFY-PAYMENT] Resident created");

    // Get subscription details
    const subscription = session.subscription as Stripe.Subscription;
    console.log("[VERIFY-PAYMENT] Subscription data:", JSON.stringify(subscription, null, 2));
    
    // Safely parse subscription dates
    let periodStart: string | null = null;
    let periodEnd: string | null = null;
    
    if (subscription?.current_period_start) {
      periodStart = new Date(subscription.current_period_start * 1000).toISOString();
    }
    if (subscription?.current_period_end) {
      periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
    }
    
    // Save subscription to database
    const { error: subError } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        user_id: user.id,
        habitation_id: habitation.id,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subscription?.id || session.id,
        status: subscription?.status || "active",
        current_period_start: periodStart,
        current_period_end: periodEnd,
        cancel_at_period_end: subscription?.cancel_at_period_end || false,
      });

    if (subError) throw new Error(`Error creating subscription record: ${subError.message}`);
    console.log("[VERIFY-PAYMENT] Subscription saved");

    // Record doming orders
    const domingQuantity = (isNewAnr ? 1 : 0) + extraDomings; // 1 free if new ANR + extras
    if (domingQuantity > 0) {
      const { error: domingError } = await supabaseAdmin
        .from("doming_orders")
        .insert({
          user_id: user.id,
          anr_id: anrId,
          quantity: domingQuantity,
          unit_price: 700,
          total_price: extraDomings * 700, // Only extras are charged
          is_free: isNewAnr,
          stripe_payment_intent_id: session.payment_intent as string,
          status: "paid",
          shipping_address: address,
        });

      if (domingError) console.error("[VERIFY-PAYMENT] Warning: Error recording doming order:", domingError);
    }

    // Send confirmation email
    try {
      // Get user profile for name
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .maybeSingle();

      // Get ANR code
      const { data: anrData } = await supabaseAdmin
        .from("anrs")
        .select("code")
        .eq("id", anrId)
        .single();

      const subscriptionAmount = 12; // 12€ annual
      const domingUnitPrice = 7;
      const totalDomingAmount = extraDomings * domingUnitPrice;
      const totalAmount = subscriptionAmount + totalDomingAmount;

      const emailPayload = {
        email: user.email,
        firstName: profile?.first_name || "Cher(e) abonné(e)",
        lastName: profile?.last_name || "",
        anrCode: anrData?.code || "N/A",
        address: address,
        habitationName: habitationName,
        subscriptionAmount: subscriptionAmount,
        domingQuantity: domingQuantity,
        domingAmount: totalDomingAmount,
        totalAmount: totalAmount,
      };

      console.log("[VERIFY-PAYMENT] Sending confirmation email:", emailPayload);

      // Call the send-subscription-confirmation function
      const emailResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-subscription-confirmation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify(emailPayload),
        }
      );

      if (!emailResponse.ok) {
        const emailError = await emailResponse.text();
        console.error("[VERIFY-PAYMENT] Email send failed:", emailError);
      } else {
        console.log("[VERIFY-PAYMENT] Confirmation email sent successfully");
      }
    } catch (emailError) {
      console.error("[VERIFY-PAYMENT] Error sending confirmation email:", emailError);
      // Don't fail the whole process if email fails
    }

    console.log("[VERIFY-PAYMENT] Payment verification complete");

    return new Response(JSON.stringify({ 
      success: true, 
      habitationId: habitation.id,
      anrId,
      isNewAnr 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[VERIFY-PAYMENT] ERROR:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
