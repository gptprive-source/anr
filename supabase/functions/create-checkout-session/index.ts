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
    const { extraDomings, isNewAnr, addressData, habitationName, existingAnrId, planType = "particulier" } = body;
    console.log("[CREATE-CHECKOUT] Request body:", { extraDomings, isNewAnr, habitationName, planType });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("[CREATE-CHECKOUT] Found existing Stripe customer:", customerId);
    }

    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: "eur",
          product_data: { 
            name: "Abonnement ANR - 1 an",
            description: "Interphone numérique avec reconduction tacite annuelle"
          },
          unit_amount: 1200, // 12€
          recurring: { interval: "year" },
        },
        quantity: 1,
      },
    ];

    // Add extra domings if any (one-time payment)
    if (extraDomings > 0) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: { 
            name: "Doming supplémentaire",
            description: "Badge QR/NFC pour votre ANR"
          },
          unit_amount: 700, // 7€
        },
        quantity: extraDomings,
      });
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
