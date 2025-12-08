import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plan prices in cents
const PLAN_PRICES: Record<string, { monthly: number; name: string }> = {
  pro: { monthly: 2900, name: "ANR PRO" },
  entreprise: { monthly: 9900, name: "ANR ENTREPRISE" },
  collectivite: { monthly: 19900, name: "ANR COLLECTIVITÉS" },
};

// Addon prices in cents per month
const ADDON_PRICES: Record<string, { monthly: number; name: string }> = {
  copilot: { monthly: 999, name: "Co-Pilot IA" },
  geofencing: { monthly: 500, name: "Géofencing avancé" },
  face_recognition: { monthly: 500, name: "Reconnaissance faciale" },
  webhooks: { monthly: 1000, name: "Webhooks API" },
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PRO-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    const { 
      plan, 
      employeeCount, 
      addons, 
      companyData,
      userEmail,
      userId
    } = await req.json();
    
    logStep("Request data", { plan, employeeCount, addons: Object.keys(addons || {}), userEmail });
    
    if (!plan || !PLAN_PRICES[plan]) {
      throw new Error("Invalid plan selected");
    }
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Check if customer already exists
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }
    
    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    
    // Main plan
    const planConfig = PLAN_PRICES[plan];
    lineItems.push({
      price_data: {
        currency: "eur",
        product_data: {
          name: planConfig.name,
          description: `Abonnement ${planConfig.name} - ${employeeCount} employés max`,
        },
        unit_amount: planConfig.monthly,
        recurring: { interval: "month" },
      },
      quantity: 1,
    });
    
    // Addons (only for PRO plan, others include them)
    if (plan === "pro" && addons) {
      if (addons.copilot) {
        lineItems.push({
          price_data: {
            currency: "eur",
            product_data: { name: ADDON_PRICES.copilot.name },
            unit_amount: ADDON_PRICES.copilot.monthly,
            recurring: { interval: "month" },
          },
          quantity: 1,
        });
      }
      if (addons.geofencing) {
        lineItems.push({
          price_data: {
            currency: "eur",
            product_data: { name: ADDON_PRICES.geofencing.name },
            unit_amount: ADDON_PRICES.geofencing.monthly,
            recurring: { interval: "month" },
          },
          quantity: 1,
        });
      }
      if (addons.face_recognition) {
        lineItems.push({
          price_data: {
            currency: "eur",
            product_data: { name: ADDON_PRICES.face_recognition.name },
            unit_amount: ADDON_PRICES.face_recognition.monthly,
            recurring: { interval: "month" },
          },
          quantity: 1,
        });
      }
    }
    
    if ((plan === "entreprise" || plan === "collectivite") && addons?.webhooks) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: { name: ADDON_PRICES.webhooks.name },
          unit_amount: ADDON_PRICES.webhooks.monthly,
          recurring: { interval: "month" },
        },
        quantity: 1,
      });
    }
    
    logStep("Line items prepared", { count: lineItems.length });
    
    // Create checkout session
    const origin = req.headers.get("origin") || "https://lovable.dev";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: lineItems,
      mode: "subscription",
      success_url: `${origin}/pro/registration-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/register?type=entreprise&step=plan`,
      metadata: {
        plan,
        employee_count: employeeCount.toString(),
        user_id: userId || "",
        company_data: JSON.stringify(companyData),
        addons: JSON.stringify(addons || {}),
      },
      subscription_data: {
        metadata: {
          plan,
          employee_count: employeeCount.toString(),
          type: "pro_subscription",
        },
      },
    });
    
    logStep("Checkout session created", { sessionId: session.id, url: session.url });
    
    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
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
