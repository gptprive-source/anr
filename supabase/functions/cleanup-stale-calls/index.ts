import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    console.log("[cleanup-stale-calls] Checking for calls older than:", twoMinutesAgo);

    // Find calls that are still active but started more than 2 minutes ago
    const { data: staleCalls, error: fetchError } = await supabase
      .from("call_logs")
      .select("id")
      .in("status", ["ringing", "answered", "connecting"])
      .lt("started_at", twoMinutesAgo);

    if (fetchError) {
      console.error("[cleanup-stale-calls] Fetch error:", fetchError);
      throw fetchError;
    }

    if (!staleCalls || staleCalls.length === 0) {
      console.log("[cleanup-stale-calls] No stale calls found");
      return new Response(
        JSON.stringify({ message: "No stale calls found", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callIds = staleCalls.map(c => c.id);
    console.log("[cleanup-stale-calls] Found stale calls:", callIds.length);

    // End the stale calls
    const { error: updateCallsError } = await supabase
      .from("call_logs")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .in("id", callIds);

    if (updateCallsError) {
      console.error("[cleanup-stale-calls] Update calls error:", updateCallsError);
      throw updateCallsError;
    }

    // End participants of these calls
    const { error: updateParticipantsError } = await supabase
      .from("call_participants")
      .update({ status: "ended", left_at: new Date().toISOString() })
      .in("call_id", callIds)
      .in("status", ["ringing", "answered", "in_group", "connecting"]);

    if (updateParticipantsError) {
      console.error("[cleanup-stale-calls] Update participants error:", updateParticipantsError);
      throw updateParticipantsError;
    }

    console.log("[cleanup-stale-calls] Successfully ended", callIds.length, "stale calls");

    return new Response(
      JSON.stringify({ message: "Stale calls cleaned up", count: callIds.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[cleanup-stale-calls] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
