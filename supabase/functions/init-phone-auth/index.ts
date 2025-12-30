import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// OVH API signature generation using SHA1 (not HMAC)
async function signOvhRequest(
  method: string,
  url: string,
  body: string,
  timestamp: number,
  appSecret: string,
  consumerKey: string
): Promise<string> {
  // OVH signature = "$1$" + SHA1(applicationSecret+"+"+consumerKey+"+"+METHOD+"+"+URL+"+"+BODY+"+"+TIMESTAMP)
  const toSign = `${appSecret}+${consumerKey}+${method.toUpperCase()}+${url}+${body}+${timestamp}`;
  
  console.log("[init-phone-auth] Signature string (masked):", toSign.replace(appSecret, "***").replace(consumerKey, "***"));
  
  const encoder = new TextEncoder();
  const data = encoder.encode(toSign);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  
  return `$1$${hashHex}`;
}

// Normalize phone number to international format
function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[\s\-\.]/g, "");
  
  // If number already starts with +, it's already in international format - keep as-is
  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  
  // French format: 0033XXXXXXXXX -> +33XXXXXXXXX
  if (cleaned.startsWith("0033")) {
    return "+33" + cleaned.slice(4);
  }
  
  // French format: 33XXXXXXXXX -> +33XXXXXXXXX (only if it looks like a French number)
  if (cleaned.startsWith("33") && cleaned.length >= 11 && cleaned.length <= 12) {
    return "+33" + cleaned.slice(2);
  }
  
  // French local format: 0XXXXXXXXX -> +33XXXXXXXXX
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    return "+33" + cleaned.slice(1);
  }
  
  // Otherwise return as-is (might be missing + prefix)
  return cleaned;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { phone_number, device_id } = await req.json();

    if (!phone_number || !device_id) {
      return new Response(JSON.stringify({ error: "Numéro de téléphone et device_id requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedPhone = normalizePhoneNumber(phone_number);
    console.log("[init-phone-auth] Normalized phone:", normalizedPhone);

    // Check if phone number is already used by another account
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone_number", normalizedPhone)
      .eq("phone_verified", true)
      .neq("id", user.id)
      .maybeSingle();

    if (existingProfile) {
      return new Response(JSON.stringify({ error: "Ce numéro de téléphone est déjà utilisé par un autre compte" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if device_id is already used by another account
    const { data: existingDevice } = await supabase
      .from("profiles")
      .select("id")
      .eq("device_id", device_id)
      .neq("id", user.id)
      .maybeSingle();

    if (existingDevice) {
      return new Response(JSON.stringify({ error: "Cet appareil est déjà associé à un autre compte" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // OVH API credentials
    const appKey = Deno.env.get("OVH_APPLICATION_KEY")!;
    const appSecret = Deno.env.get("OVH_APPLICATION_SECRET")!;
    const consumerKey = Deno.env.get("OVH_CONSUMER_KEY")!;
    const billingAccount = Deno.env.get("OVH_BILLING_ACCOUNT")!;
    const ovhPhoneNumber = Deno.env.get("OVH_PHONE_NUMBER")!;

    // Get OVH API time for signature
    const timeRes = await fetch("https://eu.api.ovh.com/1.0/auth/time");
    const timestamp = await timeRes.json();

    // Create Event Token for OVH events polling
    const eventTokenUrl = `https://eu.api.ovh.com/1.0/telephony/${billingAccount}/eventToken`;
    const eventTokenBody = JSON.stringify({ expiration: "unlimited" });
    const eventTokenSignature = await signOvhRequest("POST", eventTokenUrl, eventTokenBody, timestamp, appSecret, consumerKey);

    console.log("[init-phone-auth] Creating OVH event token...");
    
    const eventTokenRes = await fetch(eventTokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Ovh-Application": appKey,
        "X-Ovh-Timestamp": String(timestamp),
        "X-Ovh-Signature": eventTokenSignature,
        "X-Ovh-Consumer": consumerKey,
      },
      body: eventTokenBody,
    });

    if (!eventTokenRes.ok) {
      const errorText = await eventTokenRes.text();
      console.error("[init-phone-auth] OVH event token error:", errorText);
      return new Response(JSON.stringify({ error: "Erreur lors de la création du token OVH" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventTokenData = await eventTokenRes.json();
    const eventToken = eventTokenData.token;
    console.log("[init-phone-auth] Event token created successfully");

    // Create verification record
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const signature = createHmac("sha256", appSecret).update(`${user.id}:${normalizedPhone}:${verificationCode}`).digest("hex");

    const { data: verification, error: insertError } = await supabase
      .from("phone_verifications")
      .insert({
        user_id: user.id,
        phone_number: normalizedPhone,
        verification_code: verificationCode,
        signature: signature,
        expires_at: expiresAt.toISOString(),
        status: "pending",
        event_token: eventToken,
        device_id: device_id,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[init-phone-auth] Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Erreur lors de la création de la vérification" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[init-phone-auth] Verification created:", verification.id);

    return new Response(JSON.stringify({
      verification_id: verification.id,
      ovh_number: ovhPhoneNumber,
      expires_at: expiresAt.toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[init-phone-auth] Error:", error);
    return new Response(JSON.stringify({ error: "Erreur interne du serveur" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
