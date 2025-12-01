import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  user_ids: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

// VAPID keys for Web Push
const VAPID_PUBLIC_KEY = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
const VAPID_PRIVATE_KEY = "Dl8fLo1xrWxENv-iYBPX7wCVw1NZOHaCKVF2YwPQxQo";

// Create JWT for Web Push authentication
async function createVapidJWT(endpoint: string): Promise<string> {
  const header = { alg: "ES256", typ: "JWT" };
  const audience = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 86400,
    sub: "mailto:contact@anr.app",
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  // Decode VAPID private key
  const padding = "=".repeat((4 - (VAPID_PRIVATE_KEY.length % 4)) % 4);
  const base64 = (VAPID_PRIVATE_KEY + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawKey = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

  // Import as ECDSA P-256 key
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signatureInput = encoder.encode(`${headerB64}.${payloadB64}`);
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    signatureInput
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

// Send Web Push notification
async function sendWebPush(subscription: any, payload: any): Promise<boolean> {
  try {
    const endpoint = subscription.endpoint;
    const jwt = await createVapidJWT(endpoint);

    const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "TTL": "86400",
        "Urgency": "high",
      },
      body: payloadBytes,
    });

    console.log("[WebPush] Response status:", response.status);
    return response.ok || response.status === 201;
  } catch (error) {
    console.error("[WebPush] Send error:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const payload: PushPayload = await req.json();
    console.log("[Push] Received request for users:", payload.user_ids);

    if (!payload.user_ids || payload.user_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "No user_ids provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get push tokens for the specified users
    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("token, platform, user_id")
      .in("user_id", payload.user_ids);

    if (tokensError) {
      console.error("[Push] Error fetching tokens:", tokensError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch tokens" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log("[Push] No tokens found for users");
      return new Response(
        JSON.stringify({ message: "No tokens found", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Push] Found ${tokens.length} tokens`);

    const pushPayload = {
      title: payload.title,
      body: payload.body,
      data: payload.data,
    };

    // Send notifications
    const results = [];
    for (const tokenData of tokens) {
      try {
        console.log(`[Push] Sending to ${tokenData.platform} device...`);
        
        if (tokenData.platform === "web") {
          // Web Push
          const subscription = JSON.parse(tokenData.token);
          const success = await sendWebPush(subscription, pushPayload);
          results.push({ user_id: tokenData.user_id, platform: "web", success });
          
          if (!success) {
            // Remove invalid subscription
            await supabase.from("push_tokens").delete().eq("token", tokenData.token);
          }
        } else {
          // Native FCM - would need FCM service account for native apps
          console.log("[Push] Native FCM not configured for:", tokenData.platform);
          results.push({ user_id: tokenData.user_id, platform: tokenData.platform, success: false });
        }
      } catch (error) {
        console.error("[Push] Error:", error);
        results.push({ user_id: tokenData.user_id, platform: tokenData.platform, success: false });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[Push] Sent ${successCount}/${tokens.length} notifications`);

    return new Response(
      JSON.stringify({ success: true, sent: successCount, total: tokens.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Push] Error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
