import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// HMAC-SHA256 pour signature du token
async function generateHMAC(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const dataToSign = encoder.encode(data);
  
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", key, dataToSign);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const {
      anr_id,
      mode = 'SINGLE', // SINGLE, SCHEDULED, EMERGENCY
      scope = 'OPEN_DOOR', // OPEN_DOOR, ENTRY_ONLY, EXIT_ONLY
      call_id,
      schedule_id,
      granted_to_user,
      granted_to_company,
      granted_to_employee,
      visitor_device_id,
      ttl_seconds,
    } = body;

    if (!anr_id) {
      return new Response(JSON.stringify({ error: 'anr_id requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Vérifier que l'utilisateur est résident de cet ANR
    const { data: resident, error: residentError } = await supabase
      .from('residents')
      .select('id, is_owner, habitation_id')
      .eq('user_id', user.id)
      .eq('status', 'verified')
      .single();

    if (residentError || !resident) {
      return new Response(JSON.stringify({ error: 'Non résident de cet ANR' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Vérifier que l'habitation appartient à cet ANR
    const { data: habitation } = await supabase
      .from('habitations')
      .select('anr_id')
      .eq('id', resident.habitation_id)
      .single();

    if (!habitation || habitation.anr_id !== anr_id) {
      return new Response(JSON.stringify({ error: 'ANR non associé à votre habitation' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Récupérer la configuration TTL
    const { data: config } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'door_token_ttl_seconds')
      .single();

    const defaultTtl = config?.value ? Number(config.value) : 60;
    const actualTtl = ttl_seconds || defaultTtl;

    // Générer le token
    const nonce = generateNonce();
    const tokenId = `ANR-${Date.now()}-${nonce.substring(0, 8)}`;
    const now = new Date();
    const validFrom = now;
    const validUntil = new Date(now.getTime() + actualTtl * 1000);

    // Récupérer la clé secrète du module de porte
    const { data: doorModule } = await supabase
      .from('door_modules')
      .select('secret_key')
      .eq('anr_id', anr_id)
      .eq('is_active', true)
      .single();

    const secretKey = doorModule?.secret_key || Deno.env.get('DOOR_TOKEN_SECRET') || 'default-secret-key';

    // Créer la signature HMAC
    const payload = `${tokenId}:${anr_id}:${validFrom.toISOString()}:${validUntil.toISOString()}:${nonce}`;
    const tokenHash = await generateHMAC(secretKey, payload);

    // Sauvegarder le token en base
    const { data: token, error: tokenError } = await supabase
      .from('door_access_tokens')
      .insert({
        token_id: tokenId,
        token_hash: tokenHash,
        anr_id,
        granted_by: user.id,
        granted_to_user,
        granted_to_company,
        granted_to_employee,
        visitor_device_id,
        call_id,
        schedule_id,
        mode,
        scope,
        nonce,
        valid_from: validFrom.toISOString(),
        valid_until: validUntil.toISOString(),
      })
      .select()
      .single();

    if (tokenError) {
      console.error('Erreur création token:', tokenError);
      return new Response(JSON.stringify({ error: 'Erreur création token' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Token généré: ${tokenId} pour ANR ${anr_id}, valide ${actualTtl}s`);

    return new Response(JSON.stringify({
      success: true,
      token: {
        id: tokenId,
        hash: tokenHash,
        valid_from: validFrom.toISOString(),
        valid_until: validUntil.toISOString(),
        ttl_seconds: actualTtl,
        mode,
        scope,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erreur generate-door-token:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur inconnue' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
