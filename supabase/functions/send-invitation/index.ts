import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to replace template variables
function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  }
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, lastName, habitationId, invitedBy, code, habitationName, anrAddress } = await req.json();

    console.log("[send-invitation] Sending invitation to:", email);
    console.log("[send-invitation] Name:", firstName, lastName);
    console.log("[send-invitation] Habitation:", habitationName);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build invitation URL
    const baseUrl = "https://anr.lovable.app";
    const encodedCode = encodeURIComponent(code);
    const invitationUrl = `${baseUrl}/invitation?code=${encodedCode}`;
    console.log("[send-invitation] Invitation URL:", invitationUrl);

    // Fetch email template from database
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_key', 'resident_invitation')
      .eq('is_active', true)
      .single();

    // Get inviter name
    let inviterName = "Un résident";
    if (invitedBy) {
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', invitedBy)
        .single();
      
      if (inviterProfile) {
        inviterName = `${inviterProfile.first_name || ''} ${inviterProfile.last_name || ''}`.trim() || "Un résident";
      }
    }

    // Prepare variables for template
    const templateVariables: Record<string, string> = {
      recipientFirstName: firstName || 'Cher(e) ami(e)',
      recipientLastName: lastName || '',
      inviterName: inviterName,
      habitationName: habitationName || 'Habitation',
      habitationAddress: anrAddress || '',
      invitationUrl: invitationUrl,
      expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
      supportEmail: 'contact@soqotomobil.com',
      cguUrl: `${baseUrl}/cgu`,
    };

    let htmlContent: string;
    let subject: string;
    const fullName = `${firstName} ${lastName}`.trim();

    if (template && !templateError) {
      console.log("[send-invitation] Using template from database");
      htmlContent = replaceVariables(template.html_content, templateVariables);
      subject = replaceVariables(template.subject, templateVariables);
    } else {
      console.log("[send-invitation] Template not found, using fallback");
      subject = `${fullName}, vous êtes invité(e) à rejoindre ${habitationName} sur ANR`;
      htmlContent = `
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
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏠 Invitation ANR</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${firstName}</strong>,</p>
      <p>Vous avez été invité(e) à rejoindre l'habitation <strong>"${habitationName}"</strong> sur ANR (Adresse Numérique Résidentielle).</p>
      ${anrAddress ? `<p>📍 <strong>Adresse :</strong> ${anrAddress}</p>` : ""}
      <p style="text-align: center;">
        <a href="${invitationUrl}" class="button">Accepter l'invitation</a>
      </p>
      <p style="color: #ef4444; font-size: 14px;">⏰ Cette invitation expire dans 24 heures.</p>
    </div>
    <div class="footer">
      <p>ANR - Adresse Numérique Résidentielle</p>
    </div>
  </div>
</body>
</html>
      `;
    }

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

    // Send email
    await client.send({
      from: Deno.env.get("SMTP_USER") || "contact@soqotomobil.com",
      to: email,
      subject: subject,
      content: `Bonjour ${firstName},\n\nVous avez été invité(e) à rejoindre l'habitation "${habitationName}" sur ANR.\n\nCliquez ici pour accepter: ${invitationUrl}\n\nCette invitation expire dans 24 heures.\n\nL'équipe ANR`,
      html: htmlContent,
    });

    await client.close();

    // Log sent document
    await supabase.from('sent_documents').insert({
      template_key: 'resident_invitation',
      recipient_email: email,
      subject: subject,
      html_snapshot: htmlContent,
      status: 'sent',
      metadata: { habitationName, inviterName, code }
    });

    console.log("[send-invitation] ✅ Email sent successfully to:", email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Invitation envoyée"
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