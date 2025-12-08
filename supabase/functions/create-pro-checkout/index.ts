import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PRO-CHECKOUT] ${step}${detailsStr}`);
};

// Fetch pricing from app_config
async function getPricingConfig(supabase: any): Promise<{
  planPrices: Record<string, { monthly: number; name: string }>;
  addonPrices: Record<string, { monthly: number; name: string }>;
  extraEmployeePrice: number;
}> {
  const { data: configs, error } = await supabase
    .from('app_config')
    .select('key, value')
    .in('key', [
      'pro_plan_price',
      'entreprise_plan_price',
      'collectivites_plan_price',
      'copilot_addon_price',
      'geofencing_addon_price',
      'facial_recognition_addon_price',
      'pro_price_per_extra_employee'
    ]);

  if (error) {
    logStep("Error fetching pricing config", { error: error.message });
    // Return default values
    return {
      planPrices: {
        pro: { monthly: 2900, name: "ANR PRO" },
        entreprise: { monthly: 9900, name: "ANR ENTREPRISE" },
        collectivite: { monthly: 19900, name: "ANR COLLECTIVITÉS" },
      },
      addonPrices: {
        copilot: { monthly: 999, name: "Co-Pilot IA" },
        geofencing: { monthly: 499, name: "Géofencing avancé" },
        face_recognition: { monthly: 799, name: "Reconnaissance faciale" },
        webhooks: { monthly: 1000, name: "Webhooks API" },
      },
      extraEmployeePrice: 200,
    };
  }

  const getConfigValue = (key: string, defaultValue: number): number => {
    const config = configs?.find((c: any) => c.key === key);
    if (!config) return defaultValue;
    const value = typeof config.value === 'string' ? parseFloat(config.value) : config.value;
    return isNaN(value) ? defaultValue : value;
  };

  // Convert euro prices to cents
  const planPrices = {
    pro: { 
      monthly: Math.round(getConfigValue('pro_plan_price', 29) * 100), 
      name: "ANR PRO" 
    },
    entreprise: { 
      monthly: Math.round(getConfigValue('entreprise_plan_price', 99) * 100), 
      name: "ANR ENTREPRISE" 
    },
    collectivite: { 
      monthly: Math.round(getConfigValue('collectivites_plan_price', 199) * 100), 
      name: "ANR COLLECTIVITÉS" 
    },
  };

  const addonPrices = {
    copilot: { 
      monthly: Math.round(getConfigValue('copilot_addon_price', 9.99) * 100), 
      name: "Co-Pilot IA" 
    },
    geofencing: { 
      monthly: Math.round(getConfigValue('geofencing_addon_price', 4.99) * 100), 
      name: "Géofencing avancé" 
    },
    face_recognition: { 
      monthly: Math.round(getConfigValue('facial_recognition_addon_price', 7.99) * 100), 
      name: "Reconnaissance faciale" 
    },
    webhooks: { monthly: 1000, name: "Webhooks API" },
  };

  const extraEmployeePrice = Math.round(getConfigValue('pro_price_per_extra_employee', 2) * 100);

  return { planPrices, addonPrices, extraEmployeePrice };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    // Initialize Supabase client to fetch config
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { 
      plan, 
      employeeCount, 
      addons, 
      companyData,
      userEmail,
      userId
    } = await req.json();
    
    logStep("Request data", { plan, employeeCount, addons: Object.keys(addons || {}), userEmail });
    
    // Fetch dynamic pricing from app_config
    const { planPrices, addonPrices, extraEmployeePrice } = await getPricingConfig(supabase);
    logStep("Pricing config loaded", { planPrices, addonPrices, extraEmployeePrice });
    
    if (!plan || !planPrices[plan]) {
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
    const planConfig = planPrices[plan];
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
            product_data: { name: addonPrices.copilot.name },
            unit_amount: addonPrices.copilot.monthly,
            recurring: { interval: "month" },
          },
          quantity: 1,
        });
      }
      if (addons.geofencing) {
        lineItems.push({
          price_data: {
            currency: "eur",
            product_data: { name: addonPrices.geofencing.name },
            unit_amount: addonPrices.geofencing.monthly,
            recurring: { interval: "month" },
          },
          quantity: 1,
        });
      }
      if (addons.face_recognition) {
        lineItems.push({
          price_data: {
            currency: "eur",
            product_data: { name: addonPrices.face_recognition.name },
            unit_amount: addonPrices.face_recognition.monthly,
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
          product_data: { name: addonPrices.webhooks.name },
          unit_amount: addonPrices.webhooks.monthly,
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