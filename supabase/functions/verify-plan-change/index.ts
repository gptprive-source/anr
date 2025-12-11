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

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    console.log("[VERIFY-PLAN-CHANGE] Starting plan change verification");

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID is required");
    console.log("[VERIFY-PLAN-CHANGE] Session ID:", sessionId);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    console.log("[VERIFY-PLAN-CHANGE] Session status:", session.status, "Payment status:", session.payment_status);

    if (session.status !== "complete" || session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    const userId = session.metadata?.user_id;
    const newPlan = session.metadata?.new_plan;
    const previousSubscriptionId = session.metadata?.previous_subscription_id;

    if (!userId || !newPlan) {
      throw new Error("Missing metadata");
    }

    console.log("[VERIFY-PLAN-CHANGE] User:", userId, "New plan:", newPlan);

    // Cancel the previous subscription
    if (previousSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(previousSubscriptionId);
        console.log("[VERIFY-PLAN-CHANGE] Cancelled previous subscription:", previousSubscriptionId);
      } catch (cancelError) {
        console.error("[VERIFY-PLAN-CHANGE] Error cancelling previous subscription:", cancelError);
        // Continue anyway - the new subscription is already active
      }
    }

    // Update the subscription record in our database
    const subscription = session.subscription as Stripe.Subscription;
    
    // Get user's habitation
    const { data: resident } = await supabaseAdmin
      .from("residents")
      .select("habitation_id")
      .eq("user_id", userId)
      .eq("status", "verified")
      .maybeSingle();

    if (resident?.habitation_id) {
      // Update existing subscription or create new one
      const { data: existingSub } = await supabaseAdmin
        .from("subscriptions")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingSub) {
        // Update existing subscription
        const { error: updateError } = await supabaseAdmin
          .from("subscriptions")
          .update({
            plan_type: newPlan,
            stripe_subscription_id: subscription?.id || session.id,
            stripe_customer_id: session.customer as string,
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingSub.id);

        if (updateError) {
          console.error("[VERIFY-PLAN-CHANGE] Update error:", updateError);
        } else {
          console.log("[VERIFY-PLAN-CHANGE] Subscription updated with new plan:", newPlan);
        }
      } else {
        // Create new subscription record
        const { error: insertError } = await supabaseAdmin
          .from("subscriptions")
          .insert({
            user_id: userId,
            habitation_id: resident.habitation_id,
            plan_type: newPlan,
            stripe_subscription_id: subscription?.id || session.id,
            stripe_customer_id: session.customer as string,
            status: "active",
          });

        if (insertError) {
          console.error("[VERIFY-PLAN-CHANGE] Insert error:", insertError);
        } else {
          console.log("[VERIFY-PLAN-CHANGE] New subscription created with plan:", newPlan);
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      newPlan,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[VERIFY-PLAN-CHANGE] ERROR:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
