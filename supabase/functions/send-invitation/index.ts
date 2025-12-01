import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const { email, habitationId, invitedBy, code, habitationName, anrAddress } = await req.json();

    console.log("[send-invitation] Sending invitation to:", email);
    console.log("[send-invitation] Habitation:", habitationName);
    console.log("[send-invitation] Code:", code);

    // Build invitation URL
    const baseUrl = "https://anr.lovable.app";
    const invitationUrl = `${baseUrl}/invitation?code=${code}`;

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
      subject: `Invitation à rejoindre ${habitationName} sur ANR`,
      content: `Bonjour,

Vous avez été invité(e) à rejoindre l'habitation "${habitationName}" sur ANR (Adresse Numérique Résidentielle).

${anrAddress ? `Adresse : ${anrAddress}` : ""}

Pour accepter cette invitation, cliquez sur le lien ci-dessous :
${invitationUrl}

Ou utilisez ce code d'invitation : ${code}

Cette invitation expire dans 24 heures.

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
    .code { background: #e5e7eb; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 24px; text-align: center; letter-spacing: 3px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏠 Invitation ANR</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      <p>Vous avez été invité(e) à rejoindre l'habitation <strong>"${habitationName}"</strong> sur ANR (Adresse Numérique Résidentielle).</p>
      ${anrAddress ? `<p>📍 <strong>Adresse :</strong> ${anrAddress}</p>` : ""}
      <p style="text-align: center;">
        <a href="${invitationUrl}" class="button">Accepter l'invitation</a>
      </p>
      <p>Ou utilisez ce code d'invitation :</p>
      <div class="code">${code}</div>
      <p style="color: #ef4444; font-size: 14px;">⏰ Cette invitation expire dans 24 heures.</p>
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

    console.log("[send-invitation] ✅ Email sent successfully to:", email);

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
