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

interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
}

// Generate JWT for Google OAuth2
async function createJWT(serviceAccount: ServiceAccount): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const signatureInput = encoder.encode(`${headerB64}.${payloadB64}`);

  // Import private key
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = serviceAccount.private_key
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, signatureInput);
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

// Get OAuth2 access token
async function getAccessToken(serviceAccount: ServiceAccount): Promise<string> {
  const jwt = await createJWT(serviceAccount);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`OAuth2 error: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const fcmServiceAccountJson = Deno.env.get("FCM_SERVICE_ACCOUNT");

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

    // Check if FCM service account is configured
    if (!fcmServiceAccountJson) {
      console.log("[Push] FCM_SERVICE_ACCOUNT not configured - notifications logged only");
      console.log("[Push] Notification:", {
        title: payload.title,
        body: payload.body,
        data: payload.data,
        platforms: tokens.map(t => t.platform)
      });
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "FCM not configured - using Realtime only",
          tokens_found: tokens.length
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse service account and get access token
    const serviceAccount: ServiceAccount = JSON.parse(fcmServiceAccountJson);
    const accessToken = await getAccessToken(serviceAccount);
    console.log("[Push] Got OAuth2 access token");

    // FCM V1 API endpoint
    const fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;

    // Send to FCM for each token
    const fcmResults = [];
    for (const tokenData of tokens) {
      try {
        console.log(`[Push] Sending to ${tokenData.platform} device...`);
        
        const fcmPayload = {
          message: {
            token: tokenData.token,
            notification: {
              title: payload.title,
              body: payload.body,
            },
            data: {
              ...payload.data,
              click_action: "OPEN_CALL",
            },
            android: {
              priority: "high",
              notification: {
                channel_id: "incoming_calls",
                sound: "default",
                default_vibrate_timings: true,
                default_light_settings: true,
              },
            },
            apns: {
              payload: {
                aps: {
                  sound: "default",
                  "content-available": 1,
                },
              },
            },
          },
        };

        const fcmResponse = await fetch(fcmEndpoint, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fcmPayload),
        });

        const fcmResult = await fcmResponse.json();
        console.log("[Push] FCM response:", JSON.stringify(fcmResult));
        
        const success = fcmResponse.ok;
        fcmResults.push({
          user_id: tokenData.user_id,
          platform: tokenData.platform,
          success,
        });

        // If token is invalid, remove it
        if (!success && fcmResult.error?.details?.some((d: any) => 
          d.errorCode === "UNREGISTERED" || d.errorCode === "INVALID_ARGUMENT"
        )) {
          console.log("[Push] Removing invalid token");
          await supabase
            .from("push_tokens")
            .delete()
            .eq("token", tokenData.token);
        }
      } catch (fcmError) {
        console.error("[Push] FCM error:", fcmError);
        fcmResults.push({
          user_id: tokenData.user_id,
          platform: tokenData.platform,
          success: false,
        });
      }
    }

    const successCount = fcmResults.filter(r => r.success).length;
    console.log(`[Push] Sent ${successCount}/${tokens.length} notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount,
        total: tokens.length,
      }),
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
