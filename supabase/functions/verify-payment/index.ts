import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Normalize address for comparison: lowercase, no punctuation, single spaces
function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/[,;.:'"!?]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')       // Multiple spaces → single space
    .trim();
}

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

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID is required");
    console.log("[VERIFY-PAYMENT] Session ID:", sessionId);

    // ============================================
    // IDEMPOTENCY CHECK FIRST - Before anything else
    // ============================================
    const { data: existingBySessionId } = await supabaseAdmin
      .from("subscriptions")
      .select("id, habitation_id")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (existingBySessionId) {
      console.log("[VERIFY-PAYMENT] Session already processed (by stripe_session_id), returning existing data");
      
      const { data: existingHab } = await supabaseAdmin
        .from("habitations")
        .select("id, anr_id")
        .eq("id", existingBySessionId.habitation_id)
        .single();

      return new Response(JSON.stringify({ 
        success: true, 
        habitationId: existingHab?.id,
        anrId: existingHab?.anr_id,
        isNewAnr: false,
        alreadyProcessed: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve session FIRST to get user_id from metadata
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });
    console.log("[VERIFY-PAYMENT] Session status:", session.status, "Payment status:", session.payment_status);

    if (session.status !== "complete" || session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    // Get user_id from Stripe metadata (this is the source of truth)
    const stripeUserId = session.metadata?.user_id;
    if (!stripeUserId) {
      throw new Error("User ID not found in session metadata");
    }
    console.log("[VERIFY-PAYMENT] User ID from Stripe metadata:", stripeUserId);

    // Try to authenticate user if auth header provided
    let authenticatedUserId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
        if (!userError && userData.user) {
          authenticatedUserId = userData.user.id;
          console.log("[VERIFY-PAYMENT] Authenticated user:", authenticatedUserId);
        }
      } catch (authError) {
        console.log("[VERIFY-PAYMENT] Auth check failed, continuing with Stripe metadata:", authError);
      }
    }

    // If authenticated, verify it matches Stripe metadata
    if (authenticatedUserId && authenticatedUserId !== stripeUserId) {
      console.warn("[VERIFY-PAYMENT] User mismatch - authenticated:", authenticatedUserId, "vs stripe:", stripeUserId);
      throw new Error("User mismatch");
    }

    // Use the user_id from Stripe metadata as the authoritative source
    const userId = stripeUserId;

    // Verify the user exists in our database
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !userProfile) {
      throw new Error("User not found in database");
    }
    console.log("[VERIFY-PAYMENT] User verified in database:", userId);

    // Secondary idempotency check on stripe_subscription_id (backup)
    const subscriptionId = (session.subscription as Stripe.Subscription)?.id || session.id;
    const { data: existingBySubId } = await supabaseAdmin
      .from("subscriptions")
      .select("id, habitation_id")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle();

    if (existingBySubId) {
      console.log("[VERIFY-PAYMENT] Session already processed (by subscription_id), returning existing data");
      
      const { data: existingHab } = await supabaseAdmin
        .from("habitations")
        .select("id, anr_id")
        .eq("id", existingBySubId.habitation_id)
        .single();

      return new Response(JSON.stringify({ 
        success: true, 
        habitationId: existingHab?.id,
        anrId: existingHab?.anr_id,
        isNewAnr: false,
        alreadyProcessed: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
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
    let actuallyNewAnr = isNewAnr; // Track if we actually created a new ANR

    // ============================================
    // BACKEND ANR EXISTENCE CHECK (normalized address comparison)
    // This overrides frontend's is_new_anr if we find a matching address
    // ============================================
    const normalizedInputAddress = normalizeAddress(address);
    console.log("[VERIFY-PAYMENT] Normalized input address:", normalizedInputAddress);

    // Fetch all existing ANRs to check for normalized address match
    const { data: existingAnrs, error: anrFetchError } = await supabaseAdmin
      .from("anrs")
      .select("id, address, code");

    if (anrFetchError) {
      console.error("[VERIFY-PAYMENT] Error fetching existing ANRs:", anrFetchError);
    }

    let matchingAnr = null;
    if (existingAnrs && existingAnrs.length > 0) {
      for (const anr of existingAnrs) {
        const normalizedExisting = normalizeAddress(anr.address);
        if (normalizedExisting === normalizedInputAddress) {
          matchingAnr = anr;
          console.log("[VERIFY-PAYMENT] Found matching ANR by normalized address:", anr.code, "| Original:", anr.address);
          break;
        }
      }
    }

    // Determine if we should create new or use existing
    if (matchingAnr) {
      // Override frontend's decision - ANR already exists
      if (isNewAnr) {
        console.log("[VERIFY-PAYMENT] OVERRIDE: Frontend said is_new_anr=true but matching ANR found, using existing:", matchingAnr.code);
      }
      anrId = matchingAnr.id;
      actuallyNewAnr = false;
      console.log("[VERIFY-PAYMENT] Using existing ANR (normalized match):", matchingAnr.code);
    } else if (isNewAnr) {
      // No match found and frontend says new - create it
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
      actuallyNewAnr = true;
      console.log("[VERIFY-PAYMENT] New ANR created:", anrCode);
    } else {
      // Frontend says existing ANR
      if (!existingAnrId) throw new Error("Existing ANR ID is required");
      anrId = existingAnrId;
      actuallyNewAnr = false;
      console.log("[VERIFY-PAYMENT] Using existing ANR (from metadata):", anrId);
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
        user_id: userId,
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
    
    // Save subscription to database WITH stripe_session_id for idempotency
    const { error: subError } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        user_id: userId,
        habitation_id: habitation.id,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subscription?.id || session.id,
        stripe_session_id: sessionId, // NEW: for idempotency
        status: subscription?.status || "active",
        current_period_start: periodStart,
        current_period_end: periodEnd,
        cancel_at_period_end: subscription?.cancel_at_period_end || false,
      });

    if (subError) throw new Error(`Error creating subscription record: ${subError.message}`);
    console.log("[VERIFY-PAYMENT] Subscription saved with session_id for idempotency");

    // Record doming orders (use actuallyNewAnr to determine free doming)
    const domingQuantity = (actuallyNewAnr ? 1 : 0) + extraDomings; // 1 free if actually new ANR + extras
    if (domingQuantity > 0) {
      const { error: domingError } = await supabaseAdmin
        .from("doming_orders")
        .insert({
          user_id: userId,
          anr_id: anrId,
          quantity: domingQuantity,
          unit_price: 700,
          total_price: extraDomings * 700, // Only extras are charged
          is_free: actuallyNewAnr,
          stripe_payment_intent_id: session.payment_intent as string,
          status: "paid",
          shipping_address: address,
        });

      if (domingError) console.error("[VERIFY-PAYMENT] Warning: Error recording doming order:", domingError);
    }

    // Get user email for confirmation
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const userEmail = authUser?.user?.email;

    // Send confirmation email
    if (userEmail) {
      try {
        // Get user profile for name
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", userId)
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
          email: userEmail,
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
    }

    console.log("[VERIFY-PAYMENT] Payment verification complete");

    return new Response(JSON.stringify({ 
      success: true, 
      habitationId: habitation.id,
      anrId,
      isNewAnr: actuallyNewAnr 
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
