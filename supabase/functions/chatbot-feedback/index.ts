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
    const { queryText, responsePreview, rating, source } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert feedback record
    const { data, error } = await supabase.from("chatbot_usage").insert({
      source: source || "feedback",
      query_text: queryText?.slice(0, 500) || null,
      response_preview: responsePreview?.slice(0, 100) || null,
      user_rating: rating,
      is_reviewed: false
    }).select("id").single();

    if (error) {
      console.error("[chatbot-feedback] Insert error:", error);
      throw error;
    }

    console.log(`[chatbot-feedback] Recorded ${rating} feedback for query: ${queryText?.slice(0, 50)}...`);

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[chatbot-feedback] Error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});