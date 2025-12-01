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

    // Check if FCM is configured
    if (!fcmServerKey) {
      console.log("[Push] FCM_SERVER_KEY not configured - notifications logged only");
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

    // Send to FCM for each token
    const fcmResults = [];
    for (const tokenData of tokens) {
      try {
        console.log(`[Push] Sending to ${tokenData.platform} device...`);
        
        const fcmPayload = {
          to: tokenData.token,
          notification: {
            title: payload.title,
            body: payload.body,
            sound: "default",
            android_channel_id: "incoming_calls",
            content_available: true,
          },
          data: {
            ...payload.data,
            click_action: "OPEN_CALL",
          },
          priority: "high",
          content_available: true,
        };

        const fcmResponse = await fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            "Authorization": `key=${fcmServerKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fcmPayload),
        });

        const fcmResult = await fcmResponse.json();
        console.log("[Push] FCM response:", JSON.stringify(fcmResult));
        
        fcmResults.push({
          user_id: tokenData.user_id,
          platform: tokenData.platform,
          success: fcmResult.success === 1,
        });

        // If token is invalid, remove it
        if (fcmResult.failure === 1 && fcmResult.results?.[0]?.error === "InvalidRegistration") {
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
