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
    }

    console.log(`[Push] Found ${tokens?.length || 0} registered tokens`);

    // With Supabase-only solution:
    // 1. The call_participants INSERT triggers Supabase Realtime
    // 2. IncomingCallListener subscribes to this and shows the call UI
    // 3. The ringtone + vibration are handled by the app
    // 4. This edge function logs the notification for debugging

    console.log("[Push] Notification:", {
      title: payload.title,
      body: payload.body,
      data: payload.data,
      platforms: tokens?.map(t => t.platform) || []
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notification sent via Supabase Realtime",
        tokens_found: tokens?.length || 0
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
