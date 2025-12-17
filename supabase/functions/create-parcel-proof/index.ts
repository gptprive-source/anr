import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProofRequest {
  parcel_id: string;
  proof_type: 'deposit' | 'pickup' | 'delivery' | 'return';
  actor_type: 'carrier' | 'relay' | 'recipient' | 'driver';
  actor_id?: string;
  actor_name?: string;
  recipient_user_id?: string;
  recipient_name?: string;
  geo_latitude?: number;
  geo_longitude?: number;
  geo_accuracy_m?: number;
  scan_method: 'nfc' | 'qr' | 'manual';
  notes?: string;
  photo_url?: string;
  device_info?: Record<string, any>;
}

// Generate SHA-256 hash
async function generateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body: ProofRequest = await req.json();
    console.log("[create-parcel-proof] Request:", body);

    // Validate required fields
    if (!body.parcel_id || !body.proof_type || !body.scan_method) {
      throw new Error("Missing required fields: parcel_id, proof_type, scan_method");
    }

    // Verify parcel exists
    const { data: parcel, error: parcelError } = await supabaseClient
      .from('parcels')
      .select('id, tracking_number, status')
      .eq('id', body.parcel_id)
      .single();

    if (parcelError || !parcel) {
      throw new Error("Parcel not found");
    }

    const timestampUtc = new Date().toISOString();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Build proof payload for hashing
    const proofPayload = {
      parcel_id: body.parcel_id,
      tracking_number: parcel.tracking_number,
      proof_type: body.proof_type,
      timestamp_utc: timestampUtc,
      geo_latitude: body.geo_latitude || null,
      geo_longitude: body.geo_longitude || null,
      scan_method: body.scan_method,
      actor_type: body.actor_type,
      actor_id: body.actor_id || null
    };

    // Generate cryptographic proof hash
    const proofHash = await generateHash(JSON.stringify(proofPayload, Object.keys(proofPayload).sort()));
    
    // Digital signature (in production, use proper signing key)
    const signatureData = `${proofHash}:${timestampUtc}:${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.substring(0, 32)}`;
    const signature = await generateHash(signatureData);

    // Build insert data
    const insertData: Record<string, any> = {
      parcel_id: body.parcel_id,
      proof_type: body.proof_type,
      actor_name: body.actor_name,
      recipient_user_id: body.recipient_user_id,
      recipient_name: body.recipient_name,
      geo_latitude: body.geo_latitude,
      geo_longitude: body.geo_longitude,
      geo_accuracy_m: body.geo_accuracy_m,
      timestamp_utc: timestampUtc,
      timestamp_device: timestampUtc,
      timezone,
      device_info: body.device_info || {},
      scan_method: body.scan_method,
      proof_hash: proofHash,
      signature,
      proof_data: proofPayload,
      notes: body.notes,
      photo_url: body.photo_url
    };

    // Set actor ID based on type
    switch (body.actor_type) {
      case 'carrier':
        insertData.actor_carrier_id = body.actor_id;
        break;
      case 'relay':
        insertData.actor_relay_id = body.actor_id;
        break;
      case 'recipient':
        insertData.actor_user_id = body.actor_id;
        break;
      case 'driver':
        insertData.actor_driver_id = body.actor_id;
        break;
    }

    // Insert proof
    const { data: proof, error: insertError } = await supabaseClient
      .from('parcel_proofs')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error("[create-parcel-proof] Insert error:", insertError);
      throw new Error(insertError.message);
    }

    // Update parcel status based on proof type
    let newStatus: string | null = null;
    const statusUpdate: Record<string, any> = {};

    switch (body.proof_type) {
      case 'deposit':
        newStatus = 'deposited_at_relay';
        statusUpdate.deposited_at = timestampUtc;
        break;
      case 'pickup':
        newStatus = 'available_for_pickup';
        statusUpdate.picked_up_at = timestampUtc;
        break;
      case 'delivery':
        newStatus = 'delivered';
        statusUpdate.delivered_at = timestampUtc;
        break;
    }

    if (newStatus) {
      statusUpdate.status = newStatus;
      await supabaseClient
        .from('parcels')
        .update(statusUpdate)
        .eq('id', body.parcel_id);
    }

    // Send notification to recipient if applicable
    if (body.proof_type === 'deposit' && parcel) {
      const { data: parcelWithRecipient } = await supabaseClient
        .from('parcels')
        .select('recipient_user_id, recipient_name')
        .eq('id', body.parcel_id)
        .single();

      if (parcelWithRecipient?.recipient_user_id) {
        await supabaseClient
          .from('user_notifications')
          .insert({
            user_id: parcelWithRecipient.recipient_user_id,
            notification_type: 'parcel_available',
            title: 'Colis disponible',
            message: `Votre colis ${parcel.tracking_number} est disponible au point relais`,
            metadata: { parcel_id: body.parcel_id, proof_id: proof.id }
          });
      }
    }

    console.log("[create-parcel-proof] Created proof:", proof.id);

    return new Response(JSON.stringify({
      success: true,
      proof: {
        id: proof.id,
        proof_hash: proofHash,
        signature,
        timestamp_utc: timestampUtc,
        geo: {
          latitude: body.geo_latitude,
          longitude: body.geo_longitude,
          accuracy_m: body.geo_accuracy_m
        }
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (error: any) {
    console.error("[create-parcel-proof] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});
