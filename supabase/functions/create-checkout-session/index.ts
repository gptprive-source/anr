import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
  extraDomings: number;
  isNewAnr: boolean;
  addressData: {
    address: string;
    latitude: number;
    longitude: number;
  };
  habitationName: string;
  existingAnrId?: string;
  planType?: string;
  referralCode?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    console.log("[CREATE-CHECKOUT] Starting checkout session creation");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    console.log("[CREATE-CHECKOUT] User authenticated:", user.email);

    const body: CheckoutRequest = await req.json();
    const { extraDomings, isNewAnr, addressData, habitationName, existingAnrId, planType = "particulier", referralCode } = body;
    console.log("[CREATE-CHECKOUT] Request body:", { extraDomings, isNewAnr, habitationName, planType, referralCode });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get the price ID for the plan from app_config
    const { data: priceConfig } = await supabaseClient
      .from("app_config")
      .select("value")
      .eq("key", `${planType}_stripe_price_id`)
      .single();

    // Fallback price IDs (correct IDs)
    const PLAN_PRICE_IDS: Record<string, string> = {
      particulier: "price_1SdGE9EDmI80OIpdZ204i5Uv",
      pro: "price_1SdGECEDmI80OIpdJluqIU4B",
      entreprise: "price_1SdGEDEDmI80OIpdFgHCHzpB",
      collectivites: "price_1SdGEFEDmI80OIpdNqCXiO0w",
    };

    const subscriptionPriceId = priceConfig?.value as string || PLAN_PRICE_IDS[planType];
    console.log("[CREATE-CHECKOUT] Using subscription price ID:", subscriptionPriceId, "for plan:", planType);

    if (!subscriptionPriceId) {
      throw new Error(`No Stripe price configured for plan: ${planType}`);
    }

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("[CREATE-CHECKOUT] Found existing Stripe customer:", customerId);
    }

    // Build line items with actual Stripe price ID
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price: subscriptionPriceId,
        quantity: 1,
      },
    ];

    // Add extra domings if any (one-time payment)
    // Note: Stripe doesn't support mixing subscription and one-time in same checkout
    // So we store the extra domings in metadata and handle separately after payment
    // Or we use a Stripe price for domings
    const DOMING_PRICE_ID = "price_1SdGbkEDmI80OIpdI5a5sjf2"; // 7€ one-time
    
    if (extraDomings > 0) {
      // For subscription mode, we can't mix one-time items
      // Instead store in metadata and charge separately or use price_data with adjustable_quantity
      console.log("[CREATE-CHECKOUT] Extra domings:", extraDomings, "will be handled via metadata");
    }

    const origin = req.headers.get("origin") || "https://anr.lovable.app";
    console.log("[CREATE-CHECKOUT] Origin URL:", origin);

    // Create checkout session with subscription mode
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "subscription",
      metadata: {
        user_id: user.id,
        user_email: user.email,
        address: addressData.address,
        latitude: addressData.latitude.toString(),
        longitude: addressData.longitude.toString(),
        habitation_name: habitationName,
        is_new_anr: isNewAnr.toString(),
        extra_domings: extraDomings.toString(),
        existing_anr_id: existingAnrId || "",
        checkout_origin: origin,
        plan_type: planType,
        referral_code: referralCode || "",
      },
      success_url: `${origin}/register?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/register?payment=cancelled`,
      subscription_data: {
        metadata: {
          user_id: user.id,
        },
      },
    });

    console.log("[CREATE-CHECKOUT] Session created:", session.id);

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CREATE-CHECKOUT] ERROR:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
