import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[process-carrier-invoice] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

const generateInvoiceNumber = (carrierId: string, date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const shortId = carrierId.slice(0, 8).toUpperCase();
  return `INV-${year}${month}-${shortId}`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Starting carrier invoice processing");

    // Get rates from config
    const { data: configData } = await supabase
      .from('app_config')
      .select('key, value')
      .in('key', [
        'carrier_rate_per_relay_deposit',
        'carrier_rate_per_direct_delivery',
        'carrier_invoice_day_of_month'
      ]);

    const configs: Record<string, number> = {};
    configData?.forEach(c => {
      configs[c.key] = parseFloat(String(c.value)) || 0;
    });

    const ratePerDeposit = configs['carrier_rate_per_relay_deposit'] || 0.30;
    const ratePerDelivery = configs['carrier_rate_per_direct_delivery'] || 0.25;
    
    logStep("Rates loaded", { ratePerDeposit, ratePerDelivery });

    // Get all verified and active carriers
    const { data: carriers, error: carriersError } = await supabase
      .from('carriers')
      .select('*')
      .eq('is_verified', true)
      .eq('is_active', true);

    if (carriersError) throw carriersError;
    logStep("Found carriers", { count: carriers?.length });

    const results: any[] = [];
    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 1); // First of current month
    
    for (const carrier of carriers || []) {
      logStep("Processing carrier", { name: carrier.company_name, id: carrier.id });

      // Get last invoice to determine period start
      const { data: lastInvoice } = await supabase
        .from('carrier_invoices')
        .select('period_end')
        .eq('carrier_id', carrier.id)
        .order('period_end', { ascending: false })
        .limit(1)
        .single();

      const periodStart = lastInvoice?.period_end 
        ? new Date(lastInvoice.period_end) 
        : new Date(now.getFullYear(), now.getMonth() - 1, 1); // Previous month start

      // Skip if period end is not after period start
      if (periodEnd <= periodStart) {
        logStep("Skipping carrier - no new period", { carrier: carrier.company_name });
        continue;
      }

      // Count deposit proofs (parcels deposited at relay by carrier)
      const { count: depositCount } = await supabase
        .from('parcel_proofs')
        .select('id', { count: 'exact', head: true })
        .eq('actor_carrier_id', carrier.id)
        .eq('proof_type', 'deposit')
        .gte('timestamp_utc', periodStart.toISOString())
        .lt('timestamp_utc', periodEnd.toISOString());

      // Count delivery proofs (direct deliveries to recipient by carrier)
      const { count: deliveryCount } = await supabase
        .from('parcel_proofs')
        .select('id', { count: 'exact', head: true })
        .eq('actor_carrier_id', carrier.id)
        .eq('proof_type', 'delivery')
        .gte('timestamp_utc', periodStart.toISOString())
        .lt('timestamp_utc', periodEnd.toISOString());

      const deposits = depositCount || 0;
      const deliveries = deliveryCount || 0;
      const totalParcels = deposits + deliveries;

      // Skip if no activity
      if (totalParcels === 0) {
        logStep("Skipping carrier - no activity", { carrier: carrier.company_name });
        results.push({
          carrier_id: carrier.id,
          carrier_name: carrier.company_name,
          status: 'no_activity',
          deposits: 0,
          deliveries: 0
        });
        continue;
      }

      // Calculate amounts
      const depositAmount = deposits * ratePerDeposit;
      const deliveryAmount = deliveries * ratePerDelivery;
      const amountHT = depositAmount + deliveryAmount;
      const vatRate = 20;
      const vatAmount = amountHT * (vatRate / 100);
      const amountTTC = amountHT + vatAmount;

      logStep("Invoice calculation", {
        carrier: carrier.company_name,
        deposits,
        deliveries,
        depositAmount,
        deliveryAmount,
        amountHT,
        amountTTC
      });

      // Build line items
      const lineItems = [];
      if (deposits > 0) {
        lineItems.push({
          description: 'Dépôts en point relais',
          quantity: deposits,
          unit_price: ratePerDeposit,
          total: depositAmount
        });
      }
      if (deliveries > 0) {
        lineItems.push({
          description: 'Livraisons directes au destinataire',
          quantity: deliveries,
          unit_price: ratePerDelivery,
          total: deliveryAmount
        });
      }

      // Generate invoice number
      const invoiceNumber = generateInvoiceNumber(carrier.id, now);

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('carrier_invoices')
        .insert({
          carrier_id: carrier.id,
          invoice_number: invoiceNumber,
          period_start: periodStart.toISOString().split('T')[0],
          period_end: periodEnd.toISOString().split('T')[0],
          parcels_count: totalParcels,
          amount_ht: amountHT,
          vat_rate: vatRate,
          amount_ttc: amountTTC,
          line_items: lineItems,
          status: 'draft',
          due_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Due in 30 days
        })
        .select()
        .single();

      if (invoiceError) {
        logStep("Invoice creation error", { carrier: carrier.company_name, error: invoiceError.message });
        results.push({
          carrier_id: carrier.id,
          carrier_name: carrier.company_name,
          status: 'error',
          error: invoiceError.message
        });
        continue;
      }

      // Create notification for carrier (if they have a user account)
      // For now, just log success
      logStep("Invoice created", { 
        invoice_id: invoice.id, 
        invoice_number: invoiceNumber,
        amount_ttc: amountTTC 
      });

      results.push({
        carrier_id: carrier.id,
        carrier_name: carrier.company_name,
        invoice_id: invoice.id,
        invoice_number: invoiceNumber,
        deposits,
        deliveries,
        amount_ht: amountHT,
        amount_ttc: amountTTC,
        status: 'created'
      });
    }

    logStep("Processing complete", { 
      total: results.length,
      created: results.filter(r => r.status === 'created').length,
      no_activity: results.filter(r => r.status === 'no_activity').length,
      errors: results.filter(r => r.status === 'error').length
    });

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      summary: {
        total_carriers: results.length,
        invoices_created: results.filter(r => r.status === 'created').length,
        no_activity: results.filter(r => r.status === 'no_activity').length,
        errors: results.filter(r => r.status === 'error').length,
        total_amount: results
          .filter(r => r.status === 'created')
          .reduce((sum, r) => sum + (r.amount_ttc || 0), 0)
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
