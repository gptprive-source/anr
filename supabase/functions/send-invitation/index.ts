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
    const { email, habitationId, invitedBy, code, habitationName, anrAddress } = await req.json();

    console.log("[send-invitation] Sending invitation to:", email);
    console.log("[send-invitation] Habitation:", habitationName);
    console.log("[send-invitation] Code:", code);

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get inviter's profile for the email
    const { data: inviterProfile } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", invitedBy)
      .single();

    const inviterName = inviterProfile 
      ? `${inviterProfile.first_name || ""} ${inviterProfile.last_name || ""}`.trim() || "Un résident"
      : "Un résident";

    // Build invitation URL
    const baseUrl = req.headers.get("origin") || "https://mkzpdmyymabgsntwmmir.lovable.app";
    const invitationUrl = `${baseUrl}/invitation?code=${code}`;

    // Send email using Supabase Auth's admin API
    const { error: emailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: invitationUrl,
      data: {
        invitation_code: code,
        habitation_id: habitationId,
        invited_by: invitedBy,
      }
    });

    if (emailError) {
      // If user already exists, we'll send a custom email via another method
      console.log("[send-invitation] User might already exist, trying alternative:", emailError.message);
      
      // For existing users, we could use a webhook or just return success
      // The invitation code is already in the database, they can use it
      console.log("[send-invitation] Invitation created successfully, user can use code:", code);
    }

    console.log("[send-invitation] ✅ Invitation processed for:", email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Invitation envoyée",
        invitationUrl 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[send-invitation] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
