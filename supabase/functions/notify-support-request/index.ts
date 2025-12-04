import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const supportEmail = config?.value ? JSON.parse(config.value) : "support@anr.app";

    const userName = profile 
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() 
      : 'Utilisateur';
    const userEmail = authUser?.user?.email || 'Email non disponible';

    // Format conversation history
    const conversationHistory = messages
      .map(m => `${m.role === 'user' ? '👤 Utilisateur' : '🤖 Bot'}: ${m.content}`)
      .join('\n\n');

    // Send email using SMTP
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");

    if (smtpHost && smtpUser && smtpPass) {
      const emailContent = `
        <h2>🆘 Nouvelle demande de support humain</h2>
        
        <p><strong>Utilisateur:</strong> ${userName}</p>
        <p><strong>Email:</strong> ${userEmail}</p>
        <p><strong>ID Conversation:</strong> ${conversationId}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
        
        <h3>Historique de la conversation:</h3>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; white-space: pre-wrap;">
${conversationHistory}
        </div>
        
        <p style="margin-top: 20px;">
          <a href="https://anr.lovable.app/admin/support" style="background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Répondre dans l'admin
          </a>
        </p>
      `;

      // Use Deno's built-in SMTP or a simple fetch to a mail API
      // For now, we'll log the email content since SMTP requires external libs
      console.log("[notify-support] Email would be sent to:", supportEmail);
      console.log("[notify-support] Email content:", emailContent);

      // Try using Resend if available
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "ANR Support <noreply@anr.app>",
            to: [supportEmail],
            subject: `🆘 Demande support: ${userName}`,
            html: emailContent,
          }),
        });

        const resendResult = await resendResponse.json();
        console.log("[notify-support] Resend response:", resendResult);
      }
    }

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