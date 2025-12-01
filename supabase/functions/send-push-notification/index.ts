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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const fcmServerKey = Deno.env.get("FCM_SERVER_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const payload: PushPayload = await req.json();
    console.log("[Push] Received request:", JSON.stringify(payload));

    if (!payload.user_ids || payload.user_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "No user_ids provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get push tokens for the specified users
    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("token, platform")
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

    // If FCM is configured, send to native apps
    if (fcmServerKey) {
      const fcmTokens = tokens
        .filter(t => t.platform === "android" || t.platform === "ios")
        .map(t => t.token);

      if (fcmTokens.length > 0) {
        console.log(`[Push] Sending to ${fcmTokens.length} FCM tokens`);
        
        // Send to FCM
        const fcmResponse = await fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            "Authorization": `key=${fcmServerKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            registration_ids: fcmTokens,
            notification: {
              title: payload.title,
              body: payload.body,
              sound: "default",
              priority: "high",
              // Android specific
              android_channel_id: "incoming_calls",
              // iOS specific
              content_available: true,
            },
            data: {
              ...payload.data,
              click_action: "FLUTTER_NOTIFICATION_CLICK",
            },
            priority: "high",
            // For iOS when app is in background
            content_available: true,
          }),
        });

        const fcmResult = await fcmResponse.json();
        console.log("[Push] FCM response:", JSON.stringify(fcmResult));
      }
    } else {
      console.log("[Push] FCM_SERVER_KEY not configured, skipping native push");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: tokens.length,
        message: "Notifications queued" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Push] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
