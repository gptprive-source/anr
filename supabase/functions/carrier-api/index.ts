import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

const logStep = (step: string, details?: any) => {
  console.log(`[carrier-api] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

// Verify carrier API key
async function verifyCarrierApiKey(supabase: any, apiKey: string): Promise<{ carrierId: string; carrierName: string } | null> {
  if (!apiKey) return null;
  
  // Hash the API key for comparison
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(apiKey));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const apiKeyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const { data: carrier, error } = await supabase
    .from('carriers')
    .select('id, company_name, is_active, api_enabled')
    .eq('api_key_hash', apiKeyHash)
    .single();

  if (error || !carrier || !carrier.is_active || !carrier.api_enabled) {
    return null;
  }

  return { carrierId: carrier.id, carrierName: carrier.company_name };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(p => p && p !== 'carrier-api');
    const method = req.method;
    
    // Verify API key
    const apiKey = req.headers.get('x-api-key');
    const carrier = await verifyCarrierApiKey(supabase, apiKey || '');
    
    if (!carrier) {
      return new Response(JSON.stringify({ error: "Invalid or missing API key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401
      });
    }

    logStep("Request", { method, path: pathParts, carrier: carrier.carrierName });

    // Route: GET /parcels - List carrier's parcels
    if (pathParts[0] === 'parcels' && method === 'GET' && !pathParts[1]) {
      const date = url.searchParams.get('date');
      const status = url.searchParams.get('status');
      const limit = parseInt(url.searchParams.get('limit') || '100');

      let query = supabase
        .from('parcels')
        .select(`
          id, tracking_number, status, parcel_type,
          recipient_name, recipient_phone, recipient_email,
          created_at, deposited_at, delivered_at,
          relay_point:relay_point_id (id, display_name)
        `)
        .eq('carrier_id', carrier.carrierId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (date) {
        query = query.gte('created_at', `${date}T00:00:00Z`).lte('created_at', `${date}T23:59:59Z`);
      }
      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ parcels: data, count: data.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Route: GET /parcels/:id - Get single parcel with proofs
    if (pathParts[0] === 'parcels' && pathParts[1] && method === 'GET') {
      const parcelId = pathParts[1];

      const { data: parcel, error: parcelError } = await supabase
        .from('parcels')
        .select(`
          *,
          relay_point:relay_point_id (id, display_name, phone),
          proofs:parcel_proofs (
            id, proof_type, timestamp_utc, geo_latitude, geo_longitude,
            actor_name, recipient_name, scan_method, proof_hash, notes
          )
        `)
        .eq('id', parcelId)
        .eq('carrier_id', carrier.carrierId)
        .single();

      if (parcelError) {
        return new Response(JSON.stringify({ error: "Parcel not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404
        });
      }

      return new Response(JSON.stringify(parcel), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Route: POST /parcels - Create new parcel
    if (pathParts[0] === 'parcels' && method === 'POST') {
      const body = await req.json();
      
      const requiredFields = ['tracking_number', 'recipient_name'];
      for (const field of requiredFields) {
        if (!body[field]) {
          return new Response(JSON.stringify({ error: `Missing required field: ${field}` }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400
          });
        }
      }

      // Find relay point by ANR code if provided
      let relayPointId = body.relay_point_id;
      if (body.relay_anr_code && !relayPointId) {
        const { data: relay } = await supabase
          .from('relay_points')
          .select('id')
          .eq('anr_code', body.relay_anr_code.toUpperCase())
          .single();
        relayPointId = relay?.id;
      }

      // Find recipient by ANR code if provided
      let recipientUserId = body.recipient_user_id;
      let recipientAnrId = body.recipient_anr_id;
      if (body.recipient_anr_code && !recipientUserId) {
        const { data: anr } = await supabase
          .from('anrs')
          .select('id')
          .ilike('code', body.recipient_anr_code)
          .single();
        if (anr) {
          recipientAnrId = anr.id;
          // Find resident
          const { data: resident } = await supabase
            .from('residents')
            .select('user_id, habitations!inner(anr_id)')
            .eq('habitations.anr_id', anr.id)
            .eq('is_owner', true)
            .single();
          recipientUserId = resident?.user_id;
        }
      }

      const { data: parcel, error } = await supabase
        .from('parcels')
        .insert({
          carrier_id: carrier.carrierId,
          tracking_number: body.tracking_number,
          external_tracking_id: body.external_tracking_id,
          recipient_user_id: recipientUserId,
          recipient_anr_id: recipientAnrId,
          recipient_name: body.recipient_name,
          recipient_phone: body.recipient_phone,
          recipient_email: body.recipient_email,
          relay_point_id: relayPointId,
          delivery_driver_id: body.driver_id,
          delivery_driver_name: body.driver_name,
          parcel_type: body.parcel_type || 'standard',
          weight_kg: body.weight_kg,
          dimensions_cm: body.dimensions_cm,
          description: body.description,
          declared_value: body.declared_value,
          estimated_delivery_at: body.estimated_delivery_at,
          metadata: body.metadata || {}
        })
        .select()
        .single();

      if (error) {
        logStep("Create parcel error", error);
        throw error;
      }

      // Update carrier total
      await supabase.rpc('increment_carrier_parcels', { carrier_id: carrier.carrierId });

      // Send notification to recipient if email is provided and parcel is at relay
      if (parcel.recipient_email && relayPointId) {
        try {
          const { data: relay } = await supabase
            .from('relay_points')
            .select('display_name, phone, anrs:anr_id (address)')
            .eq('id', relayPointId)
            .single();
          
          if (relay) {
            const anrData = Array.isArray(relay.anrs) ? relay.anrs[0] : relay.anrs;
            await supabase.functions.invoke('notify-relay-carrier', {
              body: {
                type: 'parcel_deposited_recipient',
                data: {
                  email: parcel.recipient_email,
                  recipient_name: parcel.recipient_name,
                  tracking_number: parcel.tracking_number,
                  relay_name: relay.display_name,
                  relay_address: anrData?.address || '',
                  relay_phone: relay.phone || '',
                  carrier_name: carrier.carrierName,
                  expiry_date: parcel.max_storage_until || ''
                }
              }
            });
            logStep("Recipient notification sent", { email: parcel.recipient_email });
          }
        } catch (notifError: any) {
          logStep("Notification error (non-blocking)", { error: notifError.message });
        }
      }

      logStep("Parcel created", { id: parcel.id, tracking: parcel.tracking_number });

      return new Response(JSON.stringify(parcel), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 201
      });
    }

    // Route: GET /proofs/:parcelId - Get proofs for a parcel
    if (pathParts[0] === 'proofs' && pathParts[1] && method === 'GET') {
      const parcelId = pathParts[1];

      // Verify parcel belongs to carrier
      const { data: parcel } = await supabase
        .from('parcels')
        .select('id')
        .eq('id', parcelId)
        .eq('carrier_id', carrier.carrierId)
        .single();

      if (!parcel) {
        return new Response(JSON.stringify({ error: "Parcel not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404
        });
      }

      const { data: proofs, error } = await supabase
        .from('parcel_proofs')
        .select('*')
        .eq('parcel_id', parcelId)
        .order('timestamp_utc', { ascending: true });

      if (error) throw error;

      return new Response(JSON.stringify({ proofs }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Route: GET /stats - Get carrier statistics
    if (pathParts[0] === 'stats' && method === 'GET') {
      const { data: stats } = await supabase
        .from('parcels')
        .select('status')
        .eq('carrier_id', carrier.carrierId);

      const summary = {
        total: stats?.length || 0,
        in_transit: stats?.filter(p => p.status === 'in_transit').length || 0,
        deposited: stats?.filter(p => p.status === 'deposited_at_relay').length || 0,
        delivered: stats?.filter(p => p.status === 'delivered').length || 0,
        returned: stats?.filter(p => p.status === 'returned').length || 0
      };

      return new Response(JSON.stringify(summary), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 404 for unknown routes
    return new Response(JSON.stringify({ error: "Not found", available_routes: [
      "GET /parcels",
      "GET /parcels/:id",
      "POST /parcels",
      "GET /proofs/:parcelId",
      "GET /stats"
    ]}), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 404
    });

  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});
