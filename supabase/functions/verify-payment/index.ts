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
    console.log("=====================================");
    console.log("[VERIFY-PAYMENT] Starting payment verification");
    console.log("[VERIFY-PAYMENT] Timestamp:", new Date().toISOString());
    console.log("=====================================");

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
    const referralCode = metadata.referral_code || null;

    console.log("[VERIFY-PAYMENT] Creating ANR/habitation:", { isNewAnr, habitationName, extraDomings, referralCode });

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

    // Create or reuse habitation (handle duplicates gracefully)
    let habitationId: string;
    
    // First check if this exact habitation already exists
    const { data: existingHab } = await supabaseAdmin
      .from("habitations")
      .select("id")
      .eq("anr_id", anrId)
      .eq("name", habitationName)
      .maybeSingle();
    
    if (existingHab) {
      console.log("[VERIFY-PAYMENT] Reusing existing habitation:", existingHab.id);
      habitationId = existingHab.id;
    } else {
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
      habitationId = habitation.id;
    }

    // Create resident as owner (check if already exists to avoid duplicates)
    const { data: existingResident } = await supabaseAdmin
      .from("residents")
      .select("id")
      .eq("habitation_id", habitationId)
      .eq("user_id", userId)
      .maybeSingle();
    
    if (!existingResident) {
      const { error: resError } = await supabaseAdmin
        .from("residents")
        .insert({
          habitation_id: habitationId,
          user_id: userId,
          is_owner: true,
          status: "verified",
        });

      if (resError) throw new Error(`Error creating resident: ${resError.message}`);
      console.log("[VERIFY-PAYMENT] Resident created");
    } else {
      console.log("[VERIFY-PAYMENT] Resident already exists:", existingResident.id);
    }

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
    
    // Determine plan type from metadata or default to particulier
    const planType = metadata.plan_type || "particulier";
    console.log("[VERIFY-PAYMENT] Plan type:", planType);

    // Save subscription to database WITH stripe_session_id for idempotency
    const { error: subError } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        user_id: userId,
        habitation_id: habitationId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subscription?.id || session.id,
        stripe_session_id: sessionId, // NEW: for idempotency
        status: subscription?.status || "active",
        current_period_start: periodStart,
        current_period_end: periodEnd,
        cancel_at_period_end: subscription?.cancel_at_period_end || false,
        plan_type: planType,
      });

    if (subError) throw new Error(`Error creating subscription record: ${subError.message}`);
    console.log("[VERIFY-PAYMENT] Subscription saved with session_id for idempotency");

    // ============================================
    // CONVERSATION MIGRATION: Link visitor conversations to new user
    // ============================================
    const deviceId = metadata.device_id;
    if (deviceId) {
      try {
        console.log("[VERIFY-PAYMENT] Migrating visitor conversations for device:", deviceId);
        
        // Find visitor business card by device_id
        const { data: visitorCard, error: cardError } = await supabaseAdmin
          .from("visitor_business_cards")
          .select("id")
          .eq("device_id", deviceId)
          .is("user_id", null)
          .maybeSingle();

        if (cardError) {
          console.error("[VERIFY-PAYMENT] Error finding visitor card:", cardError);
        } else if (visitorCard) {
          // Update the business card to link to the new user
          const { error: updateCardError } = await supabaseAdmin
            .from("visitor_business_cards")
            .update({ user_id: userId })
            .eq("id", visitorCard.id);

          if (updateCardError) {
            console.error("[VERIFY-PAYMENT] Error updating visitor card:", updateCardError);
          } else {
            console.log("[VERIFY-PAYMENT] Visitor business card linked to user:", visitorCard.id);
          }

          // Count migrated conversations
          const { count: messagesCount } = await supabaseAdmin
            .from("visitor_messages")
            .select("*", { count: "exact", head: true })
            .eq("business_card_id", visitorCard.id);

          if (messagesCount && messagesCount > 0) {
            // Update user profile with migrated count
            await supabaseAdmin
              .from("profiles")
              .update({ migrated_conversations_count: messagesCount })
              .eq("id", userId);

            console.log("[VERIFY-PAYMENT] Migrated", messagesCount, "conversations to user account");

            // Create notification for user about migrated conversations
            await supabaseAdmin
              .from("user_notifications")
              .insert({
                user_id: userId,
                type: "conversations_migrated",
                title: "🎉 Vos conversations ont été récupérées !",
                message: `${messagesCount} conversation${messagesCount > 1 ? 's' : ''} avec des résidents ${messagesCount > 1 ? 'ont' : 'a'} été rattachée${messagesCount > 1 ? 's' : ''} à votre compte.`,
                data: { count: messagesCount },
              });
          }
        } else {
          console.log("[VERIFY-PAYMENT] No visitor card found for device, skipping migration");
        }
      } catch (migrationError) {
        console.error("[VERIFY-PAYMENT] Error migrating conversations:", migrationError);
        // Don't fail the whole process if migration fails
      }
    }

    // Record doming orders - separate free and paid orders
    const freeDomingCount = actuallyNewAnr ? 1 : 0;
    
    // Create free doming order if new ANR
    if (freeDomingCount > 0) {
      const { error: freeDomingError } = await supabaseAdmin
        .from("doming_orders")
        .insert({
          user_id: userId,
          anr_id: anrId,
          quantity: 1,
          unit_price: 700,
          total_price: 0, // Free
          is_free: true,
          stripe_payment_intent_id: session.payment_intent as string,
          status: "paid",
          shipping_address: address,
        });

      if (freeDomingError) console.error("[VERIFY-PAYMENT] Warning: Error recording free doming order:", freeDomingError);
      else console.log("[VERIFY-PAYMENT] Free doming order created");
    }
    
    // Create paid doming order if extra domings ordered
    if (extraDomings > 0) {
      const { error: paidDomingError } = await supabaseAdmin
        .from("doming_orders")
        .insert({
          user_id: userId,
          anr_id: anrId,
          quantity: extraDomings,
          unit_price: 700,
          total_price: extraDomings * 700, // Paid
          is_free: false,
          stripe_payment_intent_id: session.payment_intent as string,
          status: "paid",
          shipping_address: address,
        });

      if (paidDomingError) console.error("[VERIFY-PAYMENT] Warning: Error recording paid doming order:", paidDomingError);
      else console.log("[VERIFY-PAYMENT] Paid doming order created:", extraDomings, "domings for", extraDomings * 700, "cents");
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

        // Fetch subscription price from app_config based on plan type
        const priceKey = `${planType}_annual_price`;
        const { data: priceConfigData } = await supabaseAdmin
          .from("app_config")
          .select("value")
          .eq("key", priceKey)
          .single();
        
        // Default prices per plan (in euros)
        const defaultPrices: Record<string, number> = {
          particulier: 36,
          pro: 348,
          entreprise: 2400,
          collectivites: 4800
        };
        
        let rawPrice = priceConfigData?.value;
        if (typeof rawPrice === 'string') {
          try {
            rawPrice = JSON.parse(rawPrice);
          } catch {
            // Not JSON, just a plain string
          }
        }
        const subscriptionAmount = Number(rawPrice) || defaultPrices[planType] || 36;
        console.log("[VERIFY-PAYMENT] Subscription amount for plan", planType, ":", subscriptionAmount);
        
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
          domingQuantity: freeDomingCount + extraDomings,
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

        // Now send the invoice
        const invoiceDate = new Date().toLocaleDateString('fr-FR');
        const invoiceNumber = `ANR-${Date.now().toString(36).toUpperCase()}`;
        
        const invoiceItems = [
          {
            description: `Abonnement ANR - ${planType.charAt(0).toUpperCase() + planType.slice(1)}`,
            quantity: 1,
            unitPrice: subscriptionAmount,
            total: subscriptionAmount,
          },
        ];

        if (freeDomingCount > 0) {
          invoiceItems.push({
            description: "Doming ANR (offert)",
            quantity: freeDomingCount,
            unitPrice: 0,
            total: 0,
          });
        }

        if (extraDomings > 0) {
          const domingUnitPrice = totalDomingAmount / extraDomings;
          invoiceItems.push({
            description: "Doming ANR supplémentaire",
            quantity: extraDomings,
            unitPrice: domingUnitPrice,
            total: totalDomingAmount,
          });
        }

        const subtotal = totalAmount / 1.2; // Reverse calculate HT from TTC
        const tax = totalAmount - subtotal;

        const invoicePayload = {
          email: userEmail,
          firstName: profile?.first_name || "Cher(e) abonné(e)",
          lastName: profile?.last_name || "",
          invoiceNumber,
          invoiceDate,
          items: invoiceItems,
          subtotal,
          tax,
          total: totalAmount,
          paymentMethod: "Carte bancaire (Stripe)",
          billingAddress: address,
          shippingAddress: address,
          orderType: "subscription",
        };

        console.log("[VERIFY-PAYMENT] Sending invoice:", invoicePayload);

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
          console.error("[VERIFY-PAYMENT] Invoice send failed:", invoiceError);
        } else {
          console.log("[VERIFY-PAYMENT] Invoice sent successfully");
        }
      } catch (emailError) {
        console.error("[VERIFY-PAYMENT] Error sending confirmation email/invoice:", emailError);
        // Don't fail the whole process if email fails
      }
    }

    // ============================================
    // REFERRAL SYSTEM: Credit referrer if applicable
    // ============================================
    if (referralCode) {
      try {
        console.log("[VERIFY-PAYMENT] Processing referral code:", referralCode);
        
        // Find the referral code record
        const { data: referralCodeRecord, error: refCodeError } = await supabaseAdmin
          .from("referral_codes")
          .select("id, user_id, is_active")
          .eq("code", referralCode)
          .eq("is_active", true)
          .maybeSingle();

        if (refCodeError) {
          console.error("[VERIFY-PAYMENT] Error fetching referral code:", refCodeError);
        } else if (referralCodeRecord && referralCodeRecord.user_id !== userId) {
          // Don't allow self-referral
          const referrerId = referralCodeRecord.user_id;
          
          // Check if this user was already referred (avoid duplicates)
          const { data: existingReferral } = await supabaseAdmin
            .from("referrals")
            .select("id")
            .eq("referred_id", userId)
            .maybeSingle();

          if (!existingReferral) {
            // Create the referral record
            const { error: referralError } = await supabaseAdmin
              .from("referrals")
              .insert({
                referrer_id: referrerId,
                referred_id: userId,
                referral_code_id: referralCodeRecord.id,
                status: "paid",
                subscription_paid_at: new Date().toISOString(),
                reward_amount: 5.00, // 5€ per referral
              });

            if (referralError) {
              console.error("[VERIFY-PAYMENT] Error creating referral:", referralError);
            } else {
              console.log("[VERIFY-PAYMENT] Referral created for referrer:", referrerId);
              
              // Get referrer and referred user info for notifications
              const { data: referrerProfile } = await supabaseAdmin
                .from("profiles")
                .select("id, first_name, last_name, referral_balance")
                .eq("id", referrerId)
                .single();

              const { data: referredProfile } = await supabaseAdmin
                .from("profiles")
                .select("first_name, last_name")
                .eq("id", userId)
                .single();

              const { data: referrerAuth } = await supabaseAdmin.auth.admin.getUserById(referrerId);
              const referrerEmail = referrerAuth?.user?.email;
              
              const currentBalance = referrerProfile?.referral_balance || 0;
              const newBalance = currentBalance + 5;

              // Update referrer's balance
              await supabaseAdmin
                .from("profiles")
                .update({ referral_balance: newBalance })
                .eq("id", referrerId);

              console.log("[VERIFY-PAYMENT] Referrer balance updated:", currentBalance, "->", newBalance);

              // Create in-app notification for referrer
              const referredName = referredProfile 
                ? `${referredProfile.first_name || ''} ${referredProfile.last_name || ''}`.trim() || 'Un utilisateur'
                : 'Un utilisateur';

              const { error: notifError } = await supabaseAdmin
                .from("user_notifications")
                .insert({
                  user_id: referrerId,
                  type: "referral_credited",
                  title: "🎉 Nouveau filleul !",
                  message: `${referredName} s'est inscrit avec votre code parrainage. +5€ crédités sur votre solde (${newBalance}€ au total).`,
                  data: {
                    referred_name: referredName,
                    amount: 5,
                    new_balance: newBalance,
                  },
                });

              if (notifError) {
                console.error("[VERIFY-PAYMENT] Error creating notification:", notifError);
              } else {
                console.log("[VERIFY-PAYMENT] In-app notification created for referrer");
              }

              // Send email notification to referrer via SMTP
              if (referrerEmail) {
                try {
                  const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");
                  
                  const smtpClient = new SMTPClient({
                    connection: {
                      hostname: Deno.env.get("SMTP_HOST") || "",
                      port: parseInt(Deno.env.get("SMTP_PORT") || "465"),
                      tls: true,
                      auth: {
                        username: Deno.env.get("SMTP_USER") || "",
                        password: Deno.env.get("SMTP_PASS") || "",
                      },
                    },
                  });

                  const referrerFirstName = referrerProfile?.first_name || "Cher parrain";

                  await smtpClient.send({
                    from: Deno.env.get("SMTP_USER") || "noreply@anr.fr",
                    to: referrerEmail,
                    subject: "🎉 Nouveau filleul inscrit - +5€ crédités !",
                    content: `Bonjour ${referrerFirstName},\n\nBonne nouvelle ! ${referredName} vient de s'inscrire sur ANR avec votre code parrainage.\n\n+5€ ont été crédités sur votre compte.\nVotre solde actuel : ${newBalance}€\n\nRappel : À partir de 50€, un virement automatique sera effectué sur votre IBAN.\n\nMerci de faire grandir la communauté ANR !\n\nL'équipe ANR`,
                    html: `
                      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h1 style="color: #0EA5E9;">🎉 Nouveau filleul inscrit !</h1>
                        <p>Bonjour <strong>${referrerFirstName}</strong>,</p>
                        <p>Bonne nouvelle ! <strong>${referredName}</strong> vient de s'inscrire sur ANR avec votre code parrainage.</p>
                        <div style="background: linear-gradient(135deg, #0EA5E9, #06B6D4); color: white; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
                          <p style="margin: 0; font-size: 24px; font-weight: bold;">+5€ crédités</p>
                          <p style="margin: 10px 0 0 0; font-size: 18px;">Solde actuel : ${newBalance}€</p>
                        </div>
                        <p style="color: #666;">📌 <strong>Rappel :</strong> À partir de 50€, un virement automatique sera effectué sur votre IBAN.</p>
                        <p style="margin-top: 30px;">Merci de faire grandir la communauté ANR !</p>
                        <p style="color: #999;">L'équipe ANR</p>
                      </div>
                    `,
                  });

                  await smtpClient.close();
                  console.log("[VERIFY-PAYMENT] Email notification sent to referrer:", referrerEmail);
                } catch (emailError) {
                  console.error("[VERIFY-PAYMENT] Error sending email notification:", emailError);
                }
              }

              // Check if auto-payout should trigger (>= 50€)
              if (newBalance >= 50) {
                console.log("[VERIFY-PAYMENT] Balance >= 50€, triggering auto-payout check");
                // Trigger payout processing (fire and forget)
                fetch(
                  `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-referral-payout`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                    },
                    body: JSON.stringify({ userId: referrerId }),
                  }
                ).catch(err => console.error("[VERIFY-PAYMENT] Payout trigger error:", err));
              }
            }
          } else {
            console.log("[VERIFY-PAYMENT] User already has a referrer, skipping");
          }
        } else if (referralCodeRecord?.user_id === userId) {
          console.log("[VERIFY-PAYMENT] Self-referral attempted, ignoring");
        } else {
          console.log("[VERIFY-PAYMENT] Referral code not found or inactive:", referralCode);
        }
      } catch (refError) {
        console.error("[VERIFY-PAYMENT] Error processing referral:", refError);
        // Don't fail the whole process if referral processing fails
      }
    }

    console.log("[VERIFY-PAYMENT] Payment verification complete");

    return new Response(JSON.stringify({ 
      success: true, 
      habitationId: habitationId,
      anrId,
      isNewAnr: actuallyNewAnr 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log("=====================================");
    console.error("[VERIFY-PAYMENT] CRITICAL ERROR:", errorMessage);
    console.error("[VERIFY-PAYMENT] Stack:", error instanceof Error ? error.stack : "N/A");
    console.log("=====================================");
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
