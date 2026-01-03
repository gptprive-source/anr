import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[process-relay-payout] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  try {
    logStep("Starting relay payout processing");

    // Get relay rate from config
    const { data: configData } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'relay_rate_per_parcel')
      .single();
    
    const ratePerParcel = configData?.value ? parseFloat(String(configData.value)) : 0.50;
    logStep("Rate per parcel", { rate: ratePerParcel });

    // Get minimum payout threshold
    const { data: thresholdData } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'relay_minimum_payout')
      .single();
    
    const minimumPayout = thresholdData?.value ? parseFloat(String(thresholdData.value)) : 10;
    logStep("Minimum payout threshold", { minimum: minimumPayout });

    // Get all active relay points with pending balance
    const { data: relayPoints, error: relayError } = await supabase
      .from('relay_points')
      .select(`
        id, user_id, display_name, iban, bic,
        profiles:user_id (first_name, last_name)
      `)
      .eq('is_active', true)
      .not('iban', 'is', null);

    if (relayError) throw relayError;
    logStep("Found relay points", { count: relayPoints?.length });

    const results: any[] = [];

    for (const relay of relayPoints || []) {
      // Count parcels handled since last payout
      const { data: lastPayout } = await supabase
        .from('relay_payouts')
        .select('period_end')
        .eq('relay_point_id', relay.id)
        .order('period_end', { ascending: false })
        .limit(1)
        .single();

      const periodStart = lastPayout?.period_end || '2024-01-01T00:00:00Z';
      const periodEnd = new Date().toISOString();

      // Count proofs (parcels handled) in period
      const { count: parcelsCount } = await supabase
        .from('parcel_proofs')
        .select('id', { count: 'exact', head: true })
        .eq('actor_relay_id', relay.id)
        .gte('timestamp_utc', periodStart)
        .lt('timestamp_utc', periodEnd);

      const parcelCount = parcelsCount || 0;
      const amount = parcelCount * ratePerParcel;

      logStep("Relay calculation", { 
        relay: relay.display_name, 
        parcels: parcelCount, 
        amount 
      });

      // Skip if below minimum
      if (amount < minimumPayout) {
        results.push({
          relay_id: relay.id,
          relay_name: relay.display_name,
          parcels: parcelCount,
          amount,
          status: 'below_minimum',
          minimum: minimumPayout
        });
        continue;
      }

      // Create payout record
      const { data: payout, error: payoutError } = await supabase
        .from('relay_payouts')
        .insert({
          relay_point_id: relay.id,
          user_id: relay.user_id,
          amount,
          parcels_count: parcelCount,
          rate_per_parcel: ratePerParcel,
          period_start: periodStart,
          period_end: periodEnd,
          status: 'pending',
          iban: relay.iban,
          bic: relay.bic
        })
        .select()
        .single();

      if (payoutError) {
        logStep("Payout insert error", payoutError);
        results.push({
          relay_id: relay.id,
          relay_name: relay.display_name,
          status: 'error',
          error: payoutError.message
        });
        continue;
      }

      // Create Stripe transfer (if Stripe Connect is configured)
      // For now, mark as pending for manual processing
      try {
        // Check if relay has Stripe account
        const { data: profile } = await supabase
          .from('profiles')
          .select('stripe_account_id')
          .eq('id', relay.user_id)
          .single();

        if (profile?.stripe_account_id) {
          const transfer = await stripe.transfers.create({
            amount: Math.round(amount * 100), // cents
            currency: 'eur',
            destination: profile.stripe_account_id,
            metadata: {
              payout_id: payout.id,
              relay_point_id: relay.id,
              parcels_count: String(parcelCount)
            }
          });

          await supabase
            .from('relay_payouts')
            .update({ 
              status: 'completed', 
              stripe_transfer_id: transfer.id,
              paid_at: new Date().toISOString()
            })
            .eq('id', payout.id);

          logStep("Stripe transfer completed", { transfer_id: transfer.id });
        }
      } catch (stripeError: any) {
        logStep("Stripe transfer skipped", { reason: stripeError.message });
        // Keep as pending for manual SEPA transfer
      }

      // Create notification for relay
      await supabase
        .from('user_notifications')
        .insert({
          user_id: relay.user_id,
          notification_type: 'relay_payout',
          title: 'Paiement relais colis',
          message: `Votre paiement de ${amount.toFixed(2)}€ pour ${parcelCount} colis est en cours de traitement.`,
          metadata: { payout_id: payout.id, amount, parcels: parcelCount }
        });

      // Send email notification
      try {
        const profiles = relay.profiles as any;
        const { data: relayProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', relay.user_id)
          .single();
        
        const { data: authUser } = await supabase.auth.admin.getUserById(relay.user_id);
        
        if (authUser?.user?.email) {
          await supabase.functions.invoke('notify-relay-carrier', {
            body: {
              type: payout.status === 'completed' ? 'relay_payout_completed' : 'relay_payout_pending',
              data: {
                email: authUser.user.email,
                relay_name: profiles?.first_name || relay.display_name,
                payout_amount: amount.toFixed(2),
                period_start: new Date(periodStart).toLocaleDateString('fr-FR'),
                period_end: new Date(periodEnd).toLocaleDateString('fr-FR'),
                parcels_count: parcelCount,
                iban_masked: relay.iban ? `****${relay.iban.slice(-4)}` : '****',
                transfer_reference: payout.id,
                payment_date: new Date().toLocaleDateString('fr-FR'),
              }
            }
          });
        }
      } catch (emailError: any) {
        logStep("Email notification failed", { error: emailError.message });
      }

      results.push({
        relay_id: relay.id,
        relay_name: relay.display_name,
        parcels: parcelCount,
        amount,
        payout_id: payout.id,
        status: 'processed'
      });
    }

    logStep("Processing complete", { processed: results.length });

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      summary: {
        total_relays: results.length,
        processed: results.filter(r => r.status === 'processed').length,
        below_minimum: results.filter(r => r.status === 'below_minimum').length,
        errors: results.filter(r => r.status === 'error').length
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});
