import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  conversationId: string;
  userId: string;
  messages: { role: string; content: string }[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, userId, messages }: NotifyRequest = await req.json();
    console.log("[notify-support] Request received:", { conversationId, userId });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", userId)
      .single();

    // Get user email from auth
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);

    // Get support email from config
    const { data: config } = await supabaseAdmin
      .from("app_config")
      .select("value")
      .eq("key", "support_email")
      .single();

    // Parse JSON value (it's stored as a JSON string with quotes)
    let supportEmail = "support@anr.app";
    if (config?.value) {
      try {
        // If it's a JSON string like "\"email@example.com\"", parse it
        const parsed = typeof config.value === 'string' ? JSON.parse(config.value) : config.value;
        supportEmail = String(parsed).trim();
      } catch {
        // If parsing fails, try to use it directly (removing any surrounding quotes)
        supportEmail = String(config.value).replace(/^["']|["']$/g, '').trim();
      }
    }
    console.log("[notify-support] Sending to support email:", supportEmail);

    const userName = profile 
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() 
      : 'Utilisateur';
    const userEmail = authUser?.user?.email || 'Email non disponible';

    // Format conversation history
    const conversationHistory = messages
      .map(m => `${m.role === 'user' ? '👤 Utilisateur' : '🤖 Bot'}: ${m.content}`)
      .join('\n\n');

    // Create SMTP client
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

    const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .info { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .conversation { background: white; padding: 20px; border-radius: 8px; white-space: pre-wrap; font-size: 14px; }
    .button { display: inline-block; background: #0ea5e9; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🆘 Demande de support humain</h1>
    </div>
    <div class="content">
      <div class="info">
        <p><strong>👤 Utilisateur:</strong> ${userName}</p>
        <p><strong>📧 Email:</strong> ${userEmail}</p>
        <p><strong>🔑 ID Conversation:</strong> ${conversationId}</p>
        <p><strong>📅 Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
      </div>
      
      <h3>💬 Historique de la conversation:</h3>
      <div class="conversation">${conversationHistory}</div>
      
      <p style="text-align: center;">
        <a href="https://anr.lovable.app/admin/support" class="button">Répondre dans l'admin</a>
      </p>
    </div>
    <div class="footer">
      <p>ANR - Support Client</p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email
    await client.send({
      from: Deno.env.get("SMTP_USER") || "contact@soqotomobil.com",
      to: supportEmail,
      subject: `🆘 Demande support: ${userName} - ${userEmail}`,
      content: `Nouvelle demande de support humain\n\nUtilisateur: ${userName}\nEmail: ${userEmail}\nConversation ID: ${conversationId}\n\nHistorique:\n${conversationHistory}\n\nRépondre: https://anr.lovable.app/admin/support`,
      html: emailContent,
    });

    await client.close();

    console.log("[notify-support] ✅ Email sent successfully to:", supportEmail);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("[notify-support] Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
};

serve(handler);
