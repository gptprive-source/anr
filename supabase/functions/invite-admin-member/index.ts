import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get the requesting user from the auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Non autorisé");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      throw new Error("Non autorisé");
    }

    // Verify the requesting user is a super_admin or admin
    const { data: requesterRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .single();

    if (!requesterRole || !["super_admin", "admin"].includes(requesterRole.role)) {
      throw new Error("Vous n'avez pas les permissions pour inviter des membres");
    }

    const { firstName, lastName, email, role, departments } = await req.json();

    console.log("[invite-admin-member] Inviting:", email, "as", role);

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (existingUser) {
      // Check if already has an admin role
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", existingUser.id)
        .maybeSingle();

      if (existingRole) {
        throw new Error("Cet utilisateur a déjà un rôle administrateur");
      }

      // Add role to existing user
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: existingUser.id, role });

      if (roleError) throw roleError;

      // Add departments if provided
      if (departments && departments.length > 0) {
        const deptInserts = departments.map((dept: string) => ({
          user_id: existingUser.id,
          department: dept,
        }));
        await supabaseAdmin.from("user_departments").insert(deptInserts);
      }

      // Update user metadata to mark as admin
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        user_metadata: {
          ...existingUser.user_metadata,
          is_admin_only: true,
        },
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Rôle administrateur ajouté à l'utilisateur existant",
          isExisting: true 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        is_admin_only: true,
      },
    });

    if (createError) {
      console.error("[invite-admin-member] Create user error:", createError);
      throw new Error("Erreur lors de la création du compte: " + createError.message);
    }

    console.log("[invite-admin-member] User created:", newUser.user.id);

    // Add role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role });

    if (roleError) {
      console.error("[invite-admin-member] Role insert error:", roleError);
      throw roleError;
    }

    // Add departments if provided
    if (departments && departments.length > 0) {
      const deptInserts = departments.map((dept: string) => ({
        user_id: newUser.user.id,
        department: dept,
      }));
      const { error: deptError } = await supabaseAdmin
        .from("user_departments")
        .insert(deptInserts);
      
      if (deptError) {
        console.error("[invite-admin-member] Department insert error:", deptError);
      }
    }

    // Generate password reset link
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${Deno.env.get("SITE_URL") || "https://anr.lovable.app"}/reset-password`,
      },
    });

    if (resetError) {
      console.error("[invite-admin-member] Reset link error:", resetError);
      throw new Error("Erreur lors de la génération du lien");
    }

    const resetLink = resetData.properties.action_link;
    console.log("[invite-admin-member] Reset link generated");

    // Send invitation email
    const client = new SMTPClient({
      connection: {
        hostname: Deno.env.get("SMTP_HOST") || "smtp.hostinger.com",
        port: parseInt(Deno.env.get("SMTP_PORT") || "465"),
        tls: true,
        auth: {
          username: Deno.env.get("SMTP_USER") || "",
          password: Deno.env.get("SMTP_PASS") || "",
        },
      },
    });

    const roleLabels: Record<string, string> = {
      super_admin: "Super Admin",
      admin: "Admin",
      moderator: "Modérateur",
      analyst: "Analyste",
    };

    const departmentLabels: Record<string, string> = {
      administratif: "Administratif",
      commercial: "Commercial",
      partenariat: "Partenariat",
      presse: "Presse",
      investisseurs: "Investisseurs",
      communication: "Communication",
      informatique: "Informatique",
      collectivites: "Collectivités",
    };

    const departmentsText = departments && departments.length > 0
      ? departments.map((d: string) => departmentLabels[d] || d).join(", ")
      : "Aucun";

    await client.send({
      from: Deno.env.get("SMTP_USER") || "contact@soqotomobil.com",
      to: email,
      subject: `🎉 Bienvenue dans l'équipe ANR - ${roleLabels[role]}`,
      content: `Bonjour ${firstName},

Vous avez été invité(e) à rejoindre l'équipe ANR en tant que ${roleLabels[role]}.

Départements assignés : ${departmentsText}

Pour activer votre compte et créer votre mot de passe, cliquez sur le lien ci-dessous :
${resetLink}

⚠️ Ce lien expire dans 24 heures.

Une fois votre mot de passe créé, connectez-vous sur :
https://anr.lovable.app/login

Vous serez automatiquement redirigé vers l'espace administration.

Cordialement,
L'équipe ANR`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #0ea5e9; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .info-box { background: white; border-radius: 8px; padding: 15px; margin: 15px 0; border-left: 4px solid #0ea5e9; }
    .warning { color: #ef4444; font-size: 14px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Bienvenue dans l'équipe ANR !</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${firstName}</strong>,</p>
      <p>Vous avez été invité(e) à rejoindre l'équipe ANR en tant que <strong>${roleLabels[role]}</strong>.</p>
      
      <div class="info-box">
        <strong>📂 Départements assignés :</strong><br>
        ${departmentsText}
      </div>
      
      <p>Pour activer votre compte et créer votre mot de passe, cliquez sur le bouton ci-dessous :</p>
      
      <p style="text-align: center;">
        <a href="${resetLink}" class="button">🔑 Créer mon mot de passe</a>
      </p>
      
      <p class="warning">⚠️ Ce lien expire dans 24 heures.</p>
      
      <p>Une fois votre mot de passe créé, connectez-vous sur :<br>
      <a href="https://anr.lovable.app/login">https://anr.lovable.app/login</a></p>
      
      <p>Vous serez automatiquement redirigé vers l'espace administration.</p>
    </div>
    <div class="footer">
      <p>ANR - Adresse Numérique Résidentielle</p>
    </div>
  </div>
</body>
</html>
      `,
    });

    await client.close();
    console.log("[invite-admin-member] ✅ Invitation email sent to:", email);

    // Log audit
    await supabaseAdmin.from("admin_audit_logs").insert({
      user_id: requestingUser.id,
      action: "admin_invite",
      entity_type: "user",
      entity_id: newUser.user.id,
      new_value: { email, role, departments, firstName, lastName },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Invitation envoyée avec succès",
        userId: newUser.user.id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[invite-admin-member] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
