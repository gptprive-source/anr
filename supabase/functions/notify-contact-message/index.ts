import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const departmentLabels: Record<string, string> = {
  administratif: "Administratif",
  commercial: "Commercial",
  partenariat: "Partenariat",
  presse: "Presse",
  investisseurs: "Investisseurs",
  communication: "Communication",
  informatique: "Informatique",
  collectivites: "Collectivités territoriales",
};

const senderTypeLabels: Record<string, string> = {
  particulier: "Particulier",
  societe: "Société",
  collectivites: "Collectivité",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messageId } = await req.json();

    if (!messageId) {
      throw new Error("Message ID required");
    }

    console.log(`Processing contact message: ${messageId}`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the message
    const { data: message, error: messageError } = await supabaseAdmin
      .from("contact_messages")
      .select("*")
      .eq("id", messageId)
      .single();

    if (messageError || !message) {
      throw new Error("Message not found");
    }

    // Get support email from config
    const { data: configData } = await supabaseAdmin
      .from("app_config")
      .select("value")
      .eq("key", "support_email")
      .single();

    const supportEmail = configData?.value || "contact@soqotomobil.com";

    // Get collaborators assigned to this department
    const { data: departmentUsers } = await supabaseAdmin
      .from("user_departments")
      .select("user_id")
      .eq("department", message.department);

    // Get their emails from auth
    const recipientEmails: string[] = [supportEmail];

    if (departmentUsers && departmentUsers.length > 0) {
      for (const du of departmentUsers) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(du.user_id);
        if (userData?.user?.email) {
          recipientEmails.push(userData.user.email);
        }
      }
    }

    // Send email notification
    const SMTP_HOST = Deno.env.get("SMTP_HOST");
    const SMTP_PORT = Deno.env.get("SMTP_PORT");
    const SMTP_USER = Deno.env.get("SMTP_USER");
    const SMTP_PASS = Deno.env.get("SMTP_PASS");

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.log("SMTP not configured, skipping email notification");
      return new Response(JSON.stringify({ success: true, emailSent: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const departmentLabel = departmentLabels[message.department] || message.department;
    const senderTypeLabel = senderTypeLabels[message.sender_type] || message.sender_type;

    // Admin notification email
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .card { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
          .header { text-align: center; margin-bottom: 24px; }
          .header h1 { color: #0ea5e9; margin: 0; font-size: 24px; }
          .badge { display: inline-block; background: #0ea5e9; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
          .info-row { display: flex; padding: 12px 0; border-bottom: 1px solid #f4f4f5; }
          .info-label { color: #71717a; width: 140px; font-size: 14px; }
          .info-value { color: #18181b; font-weight: 500; font-size: 14px; }
          .message-box { background: #f4f4f5; border-radius: 8px; padding: 16px; margin-top: 20px; }
          .message-box h3 { margin: 0 0 8px 0; font-size: 14px; color: #71717a; }
          .message-box p { margin: 0; white-space: pre-wrap; line-height: 1.6; }
          .button { display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 24px; }
          .footer { text-align: center; margin-top: 24px; color: #71717a; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <h1>📬 Nouveau message de contact</h1>
              <p style="color: #71717a; margin-top: 8px;">Un nouveau message a été reçu via le formulaire de contact</p>
            </div>
            
            <div style="text-align: center; margin-bottom: 24px;">
              <span class="badge">${departmentLabel}</span>
            </div>
            
            <div class="info-row">
              <span class="info-label">👤 Expéditeur</span>
              <span class="info-value">${message.first_name} ${message.last_name} (${senderTypeLabel})</span>
            </div>
            ${message.company_name ? `
            <div class="info-row">
              <span class="info-label">🏢 Organisation</span>
              <span class="info-value">${message.company_name}</span>
            </div>
            ` : ''}
            <div class="info-row">
              <span class="info-label">📧 Email</span>
              <span class="info-value">${message.email}</span>
            </div>
            ${message.phone ? `
            <div class="info-row">
              <span class="info-label">📱 Téléphone</span>
              <span class="info-value">${message.phone}</span>
            </div>
            ` : ''}
            ${message.address ? `
            <div class="info-row">
              <span class="info-label">🏠 Adresse</span>
              <span class="info-value">${message.address}</span>
            </div>
            ` : ''}
            ${message.anr_code ? `
            <div class="info-row">
              <span class="info-label">🏷️ Code ANR</span>
              <span class="info-value">${message.anr_code}</span>
            </div>
            ` : ''}
            ${message.subject ? `
            <div class="info-row">
              <span class="info-label">📝 Objet</span>
              <span class="info-value">${message.subject}</span>
            </div>
            ` : ''}
            
            <div class="message-box">
              <h3>💬 Message</h3>
              <p>${message.message}</p>
            </div>
            
            <div style="text-align: center;">
              <a href="https://mkzpdmyymabgsntwmmir.supabase.co/admin/messages" class="button">
                Voir dans l'admin →
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p>ANR - Adresse Numérique Résidentielle</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Confirmation email for the sender
    const confirmationHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .card { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
          .header { text-align: center; margin-bottom: 24px; }
          .header h1 { color: #0ea5e9; margin: 0; font-size: 24px; }
          .checkmark { width: 60px; height: 60px; background: #22c55e; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
          .message-preview { background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 20px 0; }
          .message-preview p { margin: 0; color: #71717a; font-size: 14px; line-height: 1.6; }
          .footer { text-align: center; margin-top: 24px; color: #71717a; font-size: 12px; }
          .signature { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e4e4e7; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <div class="checkmark">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              </div>
              <h1>Message bien reçu !</h1>
            </div>
            
            <p style="color: #3f3f46; line-height: 1.7;">
              Bonjour ${message.first_name},
            </p>
            
            <p style="color: #3f3f46; line-height: 1.7;">
              Nous avons bien reçu votre message et nous vous remercions de nous avoir contacté. Notre équipe <strong>${departmentLabel}</strong> va examiner votre demande et vous répondra dans les meilleurs délais.
            </p>
            
            <div class="message-preview">
              <p><strong>Récapitulatif de votre message :</strong></p>
              ${message.subject ? `<p style="margin-top: 8px;"><em>Objet : ${message.subject}</em></p>` : ''}
              <p style="margin-top: 8px; white-space: pre-wrap;">${message.message.substring(0, 300)}${message.message.length > 300 ? '...' : ''}</p>
            </div>
            
            <p style="color: #3f3f46; line-height: 1.7;">
              Si vous avez des questions urgentes, n'hésitez pas à nous recontacter.
            </p>
            
            <div class="signature">
              <p style="margin: 0; color: #3f3f46;">
                Cordialement,<br>
                <strong>L'équipe ANR</strong>
              </p>
            </div>
          </div>
          
          <div class="footer">
            <p>ANR - Adresse Numérique Résidentielle</p>
            <p style="margin-top: 8px;">Ceci est un message automatique, merci de ne pas y répondre directement.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email using SMTP
    const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");

    const client = new SMTPClient({
      connection: {
        hostname: SMTP_HOST,
        port: parseInt(SMTP_PORT || "465"),
        tls: true,
        auth: {
          username: SMTP_USER,
          password: SMTP_PASS,
        },
      },
    });

    // Send notification to admin team
    const uniqueRecipients = [...new Set(recipientEmails)];
    await client.send({
      from: SMTP_USER,
      to: uniqueRecipients,
      subject: `📬 Nouveau message - ${departmentLabel} - ${message.first_name} ${message.last_name}`,
      html: adminEmailHtml,
    });
    console.log(`Admin notification sent to ${uniqueRecipients.length} recipients`);

    // Send confirmation to the sender
    await client.send({
      from: SMTP_USER,
      to: [message.email],
      subject: `✅ ANR - Nous avons bien reçu votre message`,
      html: confirmationHtml,
    });
    console.log(`Confirmation email sent to ${message.email}`);

    await client.close();

    return new Response(
      JSON.stringify({ success: true, emailSent: true, recipientCount: uniqueRecipients.length, confirmationSent: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in notify-contact-message:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
