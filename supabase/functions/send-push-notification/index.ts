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

// Helper to convert base64url to Uint8Array
function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Helper to convert Uint8Array to base64url
function uint8ArrayToBase64Url(uint8Array: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...uint8Array));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// Create VAPID JWT using proper JWK import
async function createVapidJWT(endpoint: string): Promise<string> {
  const audience = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);
  
  const header = { alg: "ES256", typ: "JWT" };
  const payload = {
    aud: audience,
    exp: now + 86400,
    sub: "mailto:contact@anr-app.fr",
  };

  const headerB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));

  // Import private key as JWK for ECDSA P-256
  const privateKeyBytes = base64UrlToUint8Array(VAPID_PRIVATE_KEY);
  const publicKeyBytes = base64UrlToUint8Array(VAPID_PUBLIC_KEY);
  
  // Create JWK from raw keys (uncompressed public key format: 0x04 || x || y)
  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: uint8ArrayToBase64Url(publicKeyBytes.slice(1, 33)),
    y: uint8ArrayToBase64Url(publicKeyBytes.slice(33, 65)),
    d: uint8ArrayToBase64Url(privateKeyBytes),
  };

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signatureInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signatureBuffer = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    signatureInput
  );

  const signature = new Uint8Array(signatureBuffer);
  const signatureB64 = uint8ArrayToBase64Url(signature);

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

// Send Web Push notification
async function sendWebPush(subscription: any, payload: any): Promise<boolean> {
  try {
    const endpoint = subscription.endpoint;
    console.log("[WebPush] Sending to endpoint:", endpoint);
    
    // Check if this is an FCM endpoint - use FCM API directly instead of Web Push
    if (endpoint.includes("fcm.googleapis.com")) {
      // Extract the FCM token from the Web Push endpoint
      // Format: https://fcm.googleapis.com/fcm/send/TOKEN
      const tokenMatch = endpoint.match(/\/fcm\/send\/(.+)$/);
      if (tokenMatch && tokenMatch[1]) {
        const fcmToken = tokenMatch[1];
        console.log("[WebPush] FCM endpoint detected, using FCM API with extracted token");
        return await sendFCMNotification(fcmToken, payload);
      }
    }
    
    // For non-FCM endpoints (Firefox, Safari), use VAPID
    const jwt = await createVapidJWT(endpoint);
    console.log("[WebPush] JWT created successfully");

    const payloadString = JSON.stringify(payload);
    const payloadBytes = new TextEncoder().encode(payloadString);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
        "Content-Type": "application/octet-stream",
        "Content-Length": payloadBytes.length.toString(),
        "TTL": "86400",
        "Urgency": "high",
      },
      body: payloadBytes,
    });

    console.log("[WebPush] Response status:", response.status);
    
    if (!response.ok) {
      const text = await response.text();
      console.error("[WebPush] Error response:", text);
    }
    
    return response.ok || response.status === 201;
  } catch (error) {
    console.error("[WebPush] Send error:", error);
    return false;
  }
}

// Get Firebase access token using service account
async function getFirebaseAccessToken(): Promise<string | null> {
  try {
    const serviceAccountJson = Deno.env.get("FCM_SERVICE_ACCOUNT");
    if (!serviceAccountJson) {
      console.error("[FCM] FCM_SERVICE_ACCOUNT not configured");
      return null;
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    const now = Math.floor(Date.now() / 1000);

    // Create JWT header
    const header = {
      alg: "RS256",
      typ: "JWT",
    };

    // Create JWT claims
    const claims = {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    };

    // Encode header and claims
    const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    const claimsB64 = btoa(JSON.stringify(claims)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    const unsignedToken = `${headerB64}.${claimsB64}`;

    // Import RSA private key
    const pemContents = serviceAccount.private_key
      .replace(/-----BEGIN PRIVATE KEY-----/, "")
      .replace(/-----END PRIVATE KEY-----/, "")
      .replace(/\n/g, "");
    
    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
    const privateKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    // Sign the token
    const signatureBuffer = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      privateKey,
      new TextEncoder().encode(unsignedToken)
    );
    
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    const signedJwt = `${unsignedToken}.${signatureB64}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedJwt}`,
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error("[FCM] Token exchange failed:", error);
      return null;
    }

    const tokenData = await tokenResponse.json();
    console.log("[FCM] Got access token successfully");
    return tokenData.access_token;
  } catch (error) {
    console.error("[FCM] Error getting access token:", error);
    return null;
  }
}

// Send FCM notification to Android device
async function sendFCMNotification(fcmToken: string, payload: any): Promise<boolean> {
  try {
    const serviceAccountJson = Deno.env.get("FCM_SERVICE_ACCOUNT");
    if (!serviceAccountJson) {
      console.error("[FCM] FCM_SERVICE_ACCOUNT not configured");
      return false;
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id;
    
    const accessToken = await getFirebaseAccessToken();
    if (!accessToken) {
      console.error("[FCM] Could not get access token");
      return false;
    }

    console.log("[FCM] Sending to token:", fcmToken.substring(0, 20) + "...");

    const fcmPayload = {
      message: {
        token: fcmToken,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        android: {
          priority: "high",
          notification: {
            channel_id: payload.data?.type === "incoming_call" ? "incoming_calls" : "default",
            sound: payload.data?.type === "incoming_call" ? "ringtone" : "default",
            visibility: "public",
            priority: "max",
          },
        },
        data: payload.data || {},
      },
    };

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fcmPayload),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("[FCM] Send failed:", response.status, error);
      return false;
    }

    const result = await response.json();
    console.log("[FCM] ✅ Sent successfully:", result.name);
    return true;
  } catch (error) {
    console.error("[FCM] Error sending:", error);
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

    const results = [];
    for (const tokenData of tokens) {
      try {
        console.log(`[Push] Sending to ${tokenData.platform} device...`);
        
        if (tokenData.platform === "web") {
          const subscription = JSON.parse(tokenData.token);
          const success = await sendWebPush(subscription, pushPayload);
          results.push({ user_id: tokenData.user_id, platform: "web", success });
          
          if (!success) {
            await supabase.from("push_tokens").delete().eq("token", tokenData.token);
          }
        } else if (tokenData.platform === "android") {
          // Send via FCM for Android
          const success = await sendFCMNotification(tokenData.token, pushPayload);
          results.push({ user_id: tokenData.user_id, platform: "android", success });
          
          // Remove invalid token if sending failed
          if (!success) {
            console.log("[Push] Removing invalid Android token");
            await supabase.from("push_tokens").delete().eq("token", tokenData.token);
          }
        } else if (tokenData.platform === "ios") {
          // iOS also uses FCM in Capacitor
          const success = await sendFCMNotification(tokenData.token, pushPayload);
          results.push({ user_id: tokenData.user_id, platform: "ios", success });
          
          if (!success) {
            console.log("[Push] Removing invalid iOS token");
            await supabase.from("push_tokens").delete().eq("token", tokenData.token);
          }
        } else {
          console.log("[Push] Unknown platform:", tokenData.platform);
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
