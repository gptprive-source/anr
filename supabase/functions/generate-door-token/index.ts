import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Base64URL encoding (sans padding)
function base64url(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlEncode(str: string): string {
  const encoder = new TextEncoder();
  return base64url(encoder.encode(str));
}

// Générer un nonce hexadécimal de 32 caractères
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Générer un UUID v4
function generateUUID(): string {
  return crypto.randomUUID();
}

// Signer avec ECDSA P-256 (ES256)
async function signES256(privateKeyPem: string, data: string): Promise<string> {
  // Extraire la clé privée du PEM
  const pemContents = privateKeyPem
    .replace('-----BEGIN EC PRIVATE KEY-----', '')
    .replace('-----END EC PRIVATE KEY-----', '')
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  // Importer la clé
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  
  // Signer les données
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    encoder.encode(data)
  );
  
  // Convertir la signature DER en format r||s raw (64 bytes)
  const sigArray = new Uint8Array(signature);
  return base64url(sigArray);
}

// Générer le token HMAC pour validation backend (fallback si pas de clé ECDSA)
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier l'authentification
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

    // Générer les identifiants du token
    const tokenId = generateUUID();
    const nonce = generateNonce();
    const now = Math.floor(Date.now() / 1000); // Unix timestamp
    const validFrom = now;
    const validUntil = now + actualTtl;

    // Récupérer la clé secrète du module de porte
    const { data: doorModule } = await supabase
      .from('door_modules')
      .select('secret_key, device_id')
      .eq('anr_id', anr_id)
      .eq('is_active', true)
      .single();

    // Récupérer l'ANR code pour le device_id
    const { data: anr } = await supabase
      .from('anrs')
      .select('code')
      .eq('id', anr_id)
      .single();

    const deviceAnrId = anr?.code || `ANR_${anr_id.substring(0, 6).toUpperCase()}`;

    // Construire le payload JWT selon les specs ChatGPT
    const jwtHeader = {
      alg: "ES256",
      typ: "JWT"
    };

    const jwtPayload = {
      anr_id: deviceAnrId,
      token_id: tokenId,
      res_id: user.id,
      issued_at: now,
      valid_from: validFrom,
      valid_until: validUntil,
      mode: mode,
      scope: scope,
      nonce: nonce,
      // Métadonnées additionnelles
      granted_to_user: granted_to_user || null,
      granted_to_company: granted_to_company || null,
      granted_to_employee: granted_to_employee || null,
    };

    // Encoder header et payload en base64url
    const headerB64 = base64urlEncode(JSON.stringify(jwtHeader));
    const payloadB64 = base64urlEncode(JSON.stringify(jwtPayload));
    const signingInput = `${headerB64}.${payloadB64}`;

    // Récupérer la clé privée ECDSA pour signer
    const ecdsaPrivateKey = Deno.env.get('DOOR_ECDSA_PRIVATE_KEY');
    
    let jwsToken: string;
    let tokenHash: string;

    if (ecdsaPrivateKey) {
      // Production: Signature ES256 (ECDSA P-256)
      try {
        const signature = await signES256(ecdsaPrivateKey, signingInput);
        jwsToken = `${signingInput}.${signature}`;
        tokenHash = signature;
      } catch (signError) {
        console.error('Erreur signature ECDSA:', signError);
        // Fallback HMAC
        const secretKey = doorModule?.secret_key || Deno.env.get('DOOR_TOKEN_SECRET') || 'default-secret-key';
        tokenHash = await generateHMAC(secretKey, signingInput);
        jwsToken = `${signingInput}.${base64urlEncode(tokenHash)}`;
      }
    } else {
      // Fallback: HMAC-SHA256 pour développement
      const secretKey = doorModule?.secret_key || Deno.env.get('DOOR_TOKEN_SECRET') || 'default-secret-key';
      tokenHash = await generateHMAC(secretKey, signingInput);
      jwsToken = `${signingInput}.${base64urlEncode(tokenHash)}`;
      console.warn('DOOR_ECDSA_PRIVATE_KEY non configuré, utilisation HMAC fallback');
    }

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
        valid_from: new Date(validFrom * 1000).toISOString(),
        valid_until: new Date(validUntil * 1000).toISOString(),
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

    console.log(`Token JWS généré: ${tokenId} pour ANR ${deviceAnrId}, valide ${actualTtl}s`);

    return new Response(JSON.stringify({
      success: true,
      // Token JWS compact pour BLE (format ChatGPT)
      jws_token: jwsToken,
      // Métadonnées pour l'app
      token: {
        id: tokenId,
        anr_id: deviceAnrId,
        valid_from: new Date(validFrom * 1000).toISOString(),
        valid_until: new Date(validUntil * 1000).toISOString(),
        ttl_seconds: actualTtl,
        mode,
        scope,
      },
      // UUIDs BLE pour connexion
      ble: {
        service_uuid: '0000a0a0-0000-1000-8000-00805f9b34fb',
        token_char_uuid: '0000a0a1-0000-1000-8000-00805f9b34fb',
        result_char_uuid: '0000a0a2-0000-1000-8000-00805f9b34fb',
        time_sync_char_uuid: '0000a0a3-0000-1000-8000-00805f9b34fb',
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
