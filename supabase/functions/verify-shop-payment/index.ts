import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-SHOP-PAYMENT] ${step}${detailsStr}`);
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
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "line_items.data.price.product"],
    });
    
    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }
    
    logStep("Payment verified", { paymentStatus: session.payment_status });
    
    // Parse metadata
    const metadata = session.metadata || {};
    const userId = metadata.user_id;
    const shippingName = metadata.shipping_name || "";
    const shippingAddress = metadata.shipping_address || "";
    const shippingPostalCode = metadata.shipping_postal_code || "";
    const shippingCity = metadata.shipping_city || "";
    const itemsJson = metadata.items_json || "[]";
    
    if (!userId) {
      throw new Error("User ID not found in session metadata");
    }
    
    logStep("Metadata parsed", { userId, shippingName });
    
    // Get user email and profile
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const userEmail = authUser?.user?.email;
    
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", userId)
      .maybeSingle();
    
    if (!userEmail) {
      throw new Error("User email not found");
    }
    
    // Get line items to create invoice
    const lineItems = session.line_items?.data || [];
    const invoiceItems = lineItems.map((item: any) => {
      const product = item.price?.product as any;
      return {
        description: product?.name || item.description || "Produit",
        quantity: item.quantity || 1,
        unitPrice: (item.price?.unit_amount || 0) / 100,
        total: (item.amount_total || 0) / 100,
      };
    });
    
    const totalAmount = (session.amount_total || 0) / 100;
    const subtotal = totalAmount / 1.2; // Reverse calculate HT from TTC (TVA 20%)
    const tax = totalAmount - subtotal;
    
    // Create orders in database
    const items = JSON.parse(itemsJson);
    for (const item of items) {
      // Check if it's a doming order
      if (item.type === "doming" && item.anrId) {
        const { error: domingError } = await supabaseAdmin
          .from("doming_orders")
          .insert({
            anr_id: item.anrId,
            user_id: userId,
            quantity: item.quantity,
            unit_price: item.unitPrice || 7,
            total_price: (item.unitPrice || 7) * item.quantity,
            status: "paid",
            is_free: false,
            shipping_address: `${shippingName}, ${shippingAddress}, ${shippingPostalCode} ${shippingCity}`,
            stripe_payment_intent_id: session.payment_intent as string,
          });
        
        if (domingError) {
          logStep("Error creating doming order", { error: domingError.message });
        } else {
          logStep("Doming order created");
        }
      }
      // Add more product types here (door modules, etc.)
    }
    
    // Send invoice
    const invoiceNumber = `SHOP-${Date.now().toString(36).toUpperCase()}`;
    const invoiceDate = new Date().toLocaleDateString('fr-FR');
    const fullShippingAddress = `${shippingName}\n${shippingAddress}\n${shippingPostalCode} ${shippingCity}`;
    
    const invoicePayload = {
      email: userEmail,
      firstName: profile?.first_name || shippingName.split(" ")[0] || "Client",
      lastName: profile?.last_name || shippingName.split(" ").slice(1).join(" ") || "",
      invoiceNumber,
      invoiceDate,
      items: invoiceItems,
      subtotal,
      tax,
      total: totalAmount,
      paymentMethod: "Carte bancaire (Stripe)",
      shippingAddress: fullShippingAddress,
      orderType: "shop",
    };
    
    logStep("Sending invoice", { invoiceNumber, email: userEmail });
    
    const invoiceResponse = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-invoice`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify(invoicePayload),
      }
    );
    
    if (!invoiceResponse.ok) {
      const invoiceError = await invoiceResponse.text();
      logStep("Invoice send failed", { error: invoiceError });
    } else {
      logStep("Invoice sent successfully");
    }
    
    return new Response(JSON.stringify({ 
      success: true,
      invoiceNumber,
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
