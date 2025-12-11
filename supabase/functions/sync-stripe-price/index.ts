import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Product IDs for each plan (created in Stripe)
const PLAN_PRODUCT_IDS: Record<string, string> = {
  particulier: "prod_SdFudLsHmYy0JT",
  pro: "prod_SdGD2LRGxxUFBw",
  entreprise: "prod_SdGDxQ8QcnVKNc",
  collectivites: "prod_SdGD1l8h8GIlWi",
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
    console.log("[SYNC-STRIPE-PRICE] Starting price sync");

    // Verify admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    // Check admin role
    const { data: roles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    
    const isAdmin = roles?.some(r => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) throw new Error("Unauthorized: Admin access required");

    const { planId, annualPrice } = await req.json();
    if (!planId || annualPrice === undefined) {
      throw new Error("Missing planId or annualPrice");
    }

    console.log("[SYNC-STRIPE-PRICE] Plan:", planId, "Annual price:", annualPrice, "€");

    const productId = PLAN_PRODUCT_IDS[planId];
    if (!productId) {
      throw new Error(`No Stripe product configured for plan: ${planId}`);
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Create new price in Stripe (prices are immutable, so we create a new one)
    const amountInCents = Math.round(annualPrice * 100);
    
    const newPrice = await stripe.prices.create({
      product: productId,
      unit_amount: amountInCents,
      currency: "eur",
      recurring: {
        interval: "year",
      },
      metadata: {
        plan: planId,
        created_from: "admin_sync",
      },
    });

    console.log("[SYNC-STRIPE-PRICE] Created new Stripe price:", newPrice.id);

    // Update app_config with new price ID
    const configKey = `${planId}_stripe_price_id`;
    
    // Check if config exists
    const { data: existingConfig } = await supabaseClient
      .from("app_config")
      .select("id")
      .eq("key", configKey)
      .single();

    if (existingConfig) {
      await supabaseClient
        .from("app_config")
        .update({ 
          value: newPrice.id,
          updated_at: new Date().toISOString(),
          updated_by: user.id 
        })
        .eq("key", configKey);
    } else {
      await supabaseClient
        .from("app_config")
        .insert({
          key: configKey,
          value: newPrice.id,
          category: "stripe",
          description: `Stripe Price ID for ${planId} plan`,
          updated_by: user.id,
        });
    }

    console.log("[SYNC-STRIPE-PRICE] Updated app_config with new price ID");

    // Deactivate old price (optional - keeps Stripe clean)
    const { data: oldPriceConfig } = await supabaseClient
      .from("app_config")
      .select("value")
      .eq("key", configKey)
      .single();

    if (oldPriceConfig?.value && oldPriceConfig.value !== newPrice.id) {
      try {
        await stripe.prices.update(oldPriceConfig.value as string, { active: false });
        console.log("[SYNC-STRIPE-PRICE] Deactivated old price:", oldPriceConfig.value);
      } catch (e) {
        console.log("[SYNC-STRIPE-PRICE] Could not deactivate old price (may not exist)");
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      priceId: newPrice.id,
      amount: annualPrice 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[SYNC-STRIPE-PRICE] ERROR:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
