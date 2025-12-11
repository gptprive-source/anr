import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Stripe price IDs for each plan
const PLAN_PRICE_IDS: Record<string, string> = {
  particulier: "price_1SdFulEDmI80OIpdXJsPpKkr",
  pro: "price_1SdFurEDmI80OIpdvEoTYYsy",
  entreprise: "price_1SdFutEDmI80OIpdE71JzYEL",
  collectivites: "price_1SdFuvEDmI80OIpd8w7lwSun",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    console.log("[CREATE-PLAN-CHANGE] Starting plan change session");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    console.log("[CREATE-PLAN-CHANGE] User authenticated:", user.email);

    const { newPlan } = await req.json();
    if (!newPlan) throw new Error("New plan not specified");
    console.log("[CREATE-PLAN-CHANGE] Requested plan:", newPlan);

    // Get the price ID for the new plan from app_config
    const { data: priceConfig } = await supabaseClient
      .from("app_config")
      .select("value")
      .eq("key", `${newPlan}_stripe_price_id`)
      .single();

    let priceId = priceConfig?.value as string || PLAN_PRICE_IDS[newPlan];
    
    if (!priceId) {
      throw new Error(`No Stripe price configured for plan: ${newPlan}`);
    }

    console.log("[CREATE-PLAN-CHANGE] Using price ID:", priceId);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("[CREATE-PLAN-CHANGE] Found existing customer:", customerId);
      
      // Check for existing active subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const currentSub = subscriptions.data[0];
        const currentPriceId = currentSub.items.data[0].price.id;
        
        // Check if already on the same plan
        if (currentPriceId === priceId) {
          console.log("[CREATE-PLAN-CHANGE] Already on the same plan");
          return new Response(JSON.stringify({ 
            success: true,
            message: "Vous êtes déjà sur ce plan",
            sameplan: true
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
        
        console.log("[CREATE-PLAN-CHANGE] Found active subscription:", currentSub.id);
        console.log("[CREATE-PLAN-CHANGE] Current price:", currentPriceId, "-> New price:", priceId);
        
        // Update the subscription with the new price
        const updatedSubscription = await stripe.subscriptions.update(currentSub.id, {
          items: [
            {
              id: currentSub.items.data[0].id,
              price: priceId,
            },
          ],
          proration_behavior: "create_prorations",
        });

        console.log("[CREATE-PLAN-CHANGE] Subscription updated successfully:", updatedSubscription.id);

        // Return success without redirecting to portal
        return new Response(JSON.stringify({ 
          success: true,
          updated: true,
          subscriptionId: updatedSubscription.id,
          newPlan: newPlan
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // No active subscription - create a new checkout session
    const origin = req.headers.get("origin") || "https://anr.lovable.app";
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/account?subscription=success`,
      cancel_url: `${origin}/account?subscription=cancelled`,
    });

    console.log("[CREATE-PLAN-CHANGE] Checkout session created:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CREATE-PLAN-CHANGE] ERROR:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
