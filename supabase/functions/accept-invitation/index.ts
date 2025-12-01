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
    const { code, userId, email, firstName, lastName, password } = await req.json();

    console.log("[accept-invitation] Processing invitation code:", code);
    console.log("[accept-invitation] Email:", email);

    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Validate invitation
    const { data: invitation, error: invError } = await supabaseAdmin
      .from("resident_invitations")
      .select("id, email, habitation_id, expires_at, used_at")
      .eq("code", code)
      .maybeSingle();

    if (invError) {
      console.error("[accept-invitation] Invitation fetch error:", invError);
      throw new Error("Erreur lors de la validation");
    }

    if (!invitation) {
      return new Response(
        JSON.stringify({ error: "Invitation invalide" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (invitation.used_at) {
      return new Response(
        JSON.stringify({ error: "Cette invitation a déjà été utilisée" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Cette invitation a expiré" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify email matches
    if (invitation.email.toLowerCase() !== email.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: "L'email ne correspond pas à l'invitation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let finalUserId = userId;

    // If no userId provided, create a new user
    if (!userId && password) {
      console.log("[accept-invitation] Creating new user...");
      
      const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Auto-confirm email for invited users
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
        },
      });

      if (signUpError) {
        console.error("[accept-invitation] SignUp error:", signUpError);
        
        if (signUpError.message?.includes("already been registered") || signUpError.message?.includes("already registered")) {
          return new Response(
            JSON.stringify({ error: "Cet email est déjà enregistré. Connectez-vous." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw signUpError;
      }

      if (!signUpData.user) {
        throw new Error("Erreur lors de la création du compte");
      }

      finalUserId = signUpData.user.id;
      console.log("[accept-invitation] User created:", finalUserId);
    }

    if (!finalUserId) {
      return new Response(
        JSON.stringify({ error: "ID utilisateur requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already a resident
    const { data: existingResident } = await supabaseAdmin
      .from("residents")
      .select("id")
      .eq("user_id", finalUserId)
      .eq("habitation_id", invitation.habitation_id)
      .maybeSingle();

    if (existingResident) {
      console.log("[accept-invitation] User is already a resident");
      
      // Mark invitation as used anyway
      await supabaseAdmin
        .from("resident_invitations")
        .update({ used_at: new Date().toISOString(), used_by: finalUserId })
        .eq("id", invitation.id);

      return new Response(
        JSON.stringify({ success: true, message: "Déjà résident", userId: finalUserId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add as resident
    const { error: residentError } = await supabaseAdmin.from("residents").insert({
      user_id: finalUserId,
      habitation_id: invitation.habitation_id,
      is_owner: false,
      status: "verified",
    });

    if (residentError) {
      console.error("[accept-invitation] Resident insert error:", residentError);
      throw residentError;
    }

    console.log("[accept-invitation] Resident added successfully");

    // Mark invitation as used
    const { error: updateError } = await supabaseAdmin
      .from("resident_invitations")
      .update({ used_at: new Date().toISOString(), used_by: finalUserId })
      .eq("id", invitation.id);

    if (updateError) {
      console.error("[accept-invitation] Update invitation error:", updateError);
      // Non-blocking error
    }

    console.log("[accept-invitation] ✅ Invitation accepted successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Invitation acceptée",
        userId: finalUserId,
        newUser: !userId 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[accept-invitation] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
