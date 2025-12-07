import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// HMAC-SHA256 pour vérification de signature
async function verifyHMAC(secret: string, data: string, expectedHash: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const dataToVerify = encoder.encode(data);
  
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", key, dataToVerify);
  const computedHash = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return computedHash === expectedHash;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const {
      token_id,
      token_hash,
      device_id,
      rssi,
      gps_latitude,
      gps_longitude,
    } = body;

    if (!token_id || !token_hash) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: 'TOKEN_MISSING',
        message: 'Token ID et hash requis' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Récupérer le token en base
    const { data: token, error: tokenError } = await supabase
      .from('door_access_tokens')
      .select('*')
      .eq('token_id', token_id)
      .single();

    if (tokenError || !token) {
      console.log(`Token non trouvé: ${token_id}`);
      return new Response(JSON.stringify({ 
        valid: false, 
        error: 'TOKEN_NOT_FOUND',
        message: 'Token invalide' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Vérifier si déjà consommé
    if (token.consumed_at) {
      console.log(`Token déjà consommé: ${token_id}`);
      return new Response(JSON.stringify({ 
        valid: false, 
        error: 'TOKEN_ALREADY_USED',
        message: 'Token déjà utilisé' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Vérifier la validité temporelle
    const now = new Date();
    const validFrom = new Date(token.valid_from);
    const validUntil = new Date(token.valid_until);

    if (now < validFrom) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: 'TOKEN_NOT_YET_VALID',
        message: 'Token pas encore valide' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (now > validUntil) {
      console.log(`Token expiré: ${token_id}`);
      return new Response(JSON.stringify({ 
        valid: false, 
        error: 'TOKEN_EXPIRED',
        message: 'Token expiré' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Vérifier le hash
    if (token_hash !== token.token_hash) {
      console.log(`Hash invalide pour token: ${token_id}`);
      return new Response(JSON.stringify({ 
        valid: false, 
        error: 'TOKEN_INVALID_HASH',
        message: 'Signature invalide' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Vérifier la distance GPS si fournie
    let gpsDistance = null;
    if (gps_latitude && gps_longitude) {
      const { data: anr } = await supabase
        .from('anrs')
        .select('latitude, longitude, max_gps_update_distance')
        .eq('id', token.anr_id)
        .single();

      if (anr) {
        // Calcul distance Haversine
        const R = 6371000; // Rayon terre en mètres
        const lat1 = anr.latitude * Math.PI / 180;
        const lat2 = gps_latitude * Math.PI / 180;
        const deltaLat = (gps_latitude - anr.latitude) * Math.PI / 180;
        const deltaLon = (gps_longitude - anr.longitude) * Math.PI / 180;

        const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        gpsDistance = R * c;

        const maxDistance = anr.max_gps_update_distance || 200;

        if (gpsDistance > maxDistance) {
          console.log(`Distance GPS dépassée: ${gpsDistance}m > ${maxDistance}m`);
          
          // Logger l'anomalie
          await supabase.from('security_anomalies').insert({
            anomaly_type: 'door_gps_distance_exceeded',
            anr_id: token.anr_id,
            severity: 'warning',
            visitor_latitude: gps_latitude,
            visitor_longitude: gps_longitude,
            anr_latitude: anr.latitude,
            anr_longitude: anr.longitude,
            distance_meters: gpsDistance,
            max_allowed_distance_meters: maxDistance,
            details: { token_id, device_id }
          });

          return new Response(JSON.stringify({ 
            valid: false, 
            error: 'GPS_DISTANCE_EXCEEDED',
            message: `Distance trop grande: ${Math.round(gpsDistance)}m`,
            distance: gpsDistance,
            max_distance: maxDistance
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Récupérer la durée de relais
    const { data: relayConfig } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'door_relay_duration_ms')
      .single();

    const relayDuration = relayConfig?.value ? Number(relayConfig.value) : 1000;

    // Marquer le token comme consommé
    await supabase
      .from('door_access_tokens')
      .update({
        consumed_at: now.toISOString(),
        consumed_result: 'SUCCESS',
        consumed_by_module: device_id,
      })
      .eq('id', token.id);

    // Logger l'accès
    await supabase.from('door_access_logs').insert({
      token_id: token_id,
      anr_id: token.anr_id,
      resident_id: token.granted_by,
      visitor_user_id: token.granted_to_user,
      visitor_device_id: token.visitor_device_id,
      company_id: token.granted_to_company,
      employee_id: token.granted_to_employee,
      schedule_id: token.schedule_id,
      action: token.scope === 'EXIT_ONLY' ? 'EXIT' : 'ENTRY',
      method: token.mode === 'EMERGENCY' ? 'EMERGENCY' : 'BLE',
      rssi,
      gps_latitude,
      gps_longitude,
      gps_distance_meters: gpsDistance,
      result: 'SUCCESS',
      device_id,
    });

    console.log(`Token validé: ${token_id} - Ouverture porte`);

    return new Response(JSON.stringify({ 
      valid: true, 
      action: 'OPEN_DOOR',
      relay_duration_ms: relayDuration,
      scope: token.scope,
      mode: token.mode,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erreur validate-door-token:', error);
    return new Response(JSON.stringify({ 
      valid: false,
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Erreur inconnue' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
