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
    const { targetUserId, requestingUserId, habitationId, newOwnerId } = await req.json();

    console.log("[delete-user] Request to delete user:", targetUserId);
    console.log("[delete-user] Requested by:", requestingUserId);
    console.log("[delete-user] New owner ID:", newOwnerId);

    if (!targetUserId || !requestingUserId) {
      return new Response(
        JSON.stringify({ error: "targetUserId et requestingUserId requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check authorization: either self-deletion or owner deleting invited resident
    const isSelfDeletion = targetUserId === requestingUserId;

    if (!isSelfDeletion) {
      // Verify requesting user is owner of the habitation
      if (!habitationId) {
        return new Response(
          JSON.stringify({ error: "habitationId requis pour supprimer un autre utilisateur" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: ownerCheck, error: ownerError } = await supabaseAdmin
        .from("residents")
        .select("is_owner")
        .eq("user_id", requestingUserId)
        .eq("habitation_id", habitationId)
        .eq("status", "verified")
        .maybeSingle();

      if (ownerError || !ownerCheck?.is_owner) {
        console.error("[delete-user] Authorization failed:", ownerError);
        return new Response(
          JSON.stringify({ error: "Non autorisé - seul le propriétaire peut supprimer des résidents" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify target is not an owner (can't delete owners)
      const { data: targetResident } = await supabaseAdmin
        .from("residents")
        .select("is_owner")
        .eq("user_id", targetUserId)
        .eq("habitation_id", habitationId)
        .maybeSingle();

      if (targetResident?.is_owner) {
        return new Response(
          JSON.stringify({ error: "Impossible de supprimer un propriétaire" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // If self-deletion and owner, handle ownership transfer
    if (isSelfDeletion && habitationId) {
      const { data: currentOwnership } = await supabaseAdmin
        .from("residents")
        .select("is_owner")
        .eq("user_id", targetUserId)
        .eq("habitation_id", habitationId)
        .eq("status", "verified")
        .maybeSingle();

      if (currentOwnership?.is_owner && newOwnerId) {
        console.log("[delete-user] Transferring ownership to:", newOwnerId);
        
        // Transfer ownership to new owner
        const { error: transferError } = await supabaseAdmin
          .from("residents")
          .update({ is_owner: true })
          .eq("user_id", newOwnerId)
          .eq("habitation_id", habitationId);

        if (transferError) {
          console.error("[delete-user] Ownership transfer error:", transferError);
          throw new Error("Erreur lors du transfert de propriété");
        }

        // Get new owner's email to notify them
        const { data: newOwnerAuth } = await supabaseAdmin.auth.admin.getUserById(newOwnerId);
        const { data: newOwnerProfile } = await supabaseAdmin
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", newOwnerId)
          .single();

        const { data: habitation } = await supabaseAdmin
          .from("habitations")
          .select("name, anr_id, anrs(address)")
          .eq("id", habitationId)
          .single();

        // Send notification email to new owner
        if (newOwnerAuth?.user?.email) {
          console.log("[delete-user] Sending ownership notification email to:", newOwnerAuth.user.email);
          
          // Use SMTP to send email notification
          const smtpHost = Deno.env.get("SMTP_HOST");
          const smtpPort = Deno.env.get("SMTP_PORT");
          const smtpUser = Deno.env.get("SMTP_USER");
          const smtpPass = Deno.env.get("SMTP_PASS");

          if (smtpHost && smtpUser && smtpPass) {
            try {
              const emailContent = `
                <h2>Vous êtes devenu propriétaire de la résidence</h2>
                <p>Bonjour ${newOwnerProfile?.first_name || ""},</p>
                <p>L'ancien propriétaire de votre résidence a supprimé son compte et vous a désigné comme nouveau propriétaire.</p>
                <p><strong>Résidence :</strong> ${habitation?.name || "Votre résidence"}</p>
                <p><strong>Adresse :</strong> ${(habitation as any)?.anrs?.address || "Non spécifiée"}</p>
                <p>En tant que propriétaire, vous pouvez maintenant :</p>
                <ul>
                  <li>Inviter de nouveaux résidents</li>
                  <li>Supprimer des résidents invités</li>
                  <li>Mettre à jour la position GPS de l'ANR</li>
                </ul>
                <p>Cordialement,<br>L'équipe ANR</p>
              `;

              // Note: For production, you'd use a proper email sending service
              // This is a placeholder for the notification
              console.log("[delete-user] Email notification prepared for:", newOwnerAuth.user.email);
              console.log("[delete-user] Email content:", emailContent);
            } catch (emailError) {
              console.error("[delete-user] Failed to send email notification:", emailError);
              // Don't fail the whole operation if email fails
            }
          }
        }
      }
    }

    // Clean up call_logs references (set answered_by to NULL to preserve history)
    const { error: callLogsError } = await supabaseAdmin
      .from("call_logs")
      .update({ answered_by: null })
      .eq("answered_by", targetUserId);

    if (callLogsError) {
      console.error("[delete-user] Call logs update error:", callLogsError);
    }

    // Delete the resident record first (if deleting from a specific habitation)
    if (habitationId && !isSelfDeletion) {
      const { error: residentDeleteError } = await supabaseAdmin
        .from("residents")
        .delete()
        .eq("user_id", targetUserId)
        .eq("habitation_id", habitationId);

      if (residentDeleteError) {
        console.error("[delete-user] Resident delete error:", residentDeleteError);
      }
    } else {
      // Self-deletion: delete all resident records
      const { error: residentDeleteError } = await supabaseAdmin
        .from("residents")
        .delete()
        .eq("user_id", targetUserId);

      if (residentDeleteError) {
        console.error("[delete-user] Resident delete error:", residentDeleteError);
      }
    }

    // Delete push tokens
    const { error: pushTokenError } = await supabaseAdmin
      .from("push_tokens")
      .delete()
      .eq("user_id", targetUserId);

    if (pushTokenError) {
      console.error("[delete-user] Push token delete error:", pushTokenError);
    }

    // Delete call participants
    const { error: participantError } = await supabaseAdmin
      .from("call_participants")
      .delete()
      .eq("user_id", targetUserId);

    if (participantError) {
      console.error("[delete-user] Call participant delete error:", participantError);
    }

    // Delete from auth.users (this will cascade delete profiles)
    // NOTE: ANR and habitations are NOT deleted - they remain permanently attached to the address
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

    if (authError) {
      console.error("[delete-user] Auth delete error:", authError);
      throw new Error("Erreur lors de la suppression du compte: " + authError.message);
    }

    console.log("[delete-user] ✅ User deleted successfully:", targetUserId);
    console.log("[delete-user] ℹ️ ANR and habitation preserved as per design");

    return new Response(
      JSON.stringify({ success: true, message: "Utilisateur supprimé" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[delete-user] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
