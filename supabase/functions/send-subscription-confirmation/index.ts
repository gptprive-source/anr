import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmationEmailRequest {
  email: string;
  firstName: string;
  lastName: string;
  anrCode: string;
  address: string;
  habitationName: string;
  subscriptionAmount: number;
  domingQuantity: number;
  domingAmount: number;
  totalAmount: number;
  subscriptionId?: string;
  planType?: string;
}

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
    console.log("[SEND-CONFIRMATION] Starting email send");

    const {
      email,
      firstName,
      lastName,
      anrCode,
      address,
      habitationName,
      subscriptionAmount,
      domingQuantity,
      domingAmount,
      totalAmount,
      subscriptionId,
      planType = 'particulier',
    }: ConfirmationEmailRequest = await req.json();

    console.log("[SEND-CONFIRMATION] Sending to:", email);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch email template from database
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_key', 'subscription_confirmation')
      .eq('is_active', true)
      .single();

    // Prepare variables
    const now = new Date();
    const oneYearLater = new Date(now);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    const planLabels: Record<string, string> = {
      particulier: 'Particulier',
      pro: 'Professionnel',
      entreprise: 'Entreprise',
      collectivites: 'Collectivités'
    };

    const templateVariables: Record<string, string> = {
      firstName: firstName,
      lastName: lastName,
      email: email,
      anrCode: anrCode,
      address: address,
      habitationName: habitationName,
      subscriptionAmount: subscriptionAmount.toFixed(2),
      domingQuantity: String(domingQuantity),
      domingAmount: domingAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      subscriptionId: subscriptionId || `ANR-${anrCode}`,
      planName: planLabels[planType] || planType,
      planPrice: subscriptionAmount.toFixed(2),
      billingCycle: 'Annuel',
      startDate: now.toLocaleDateString('fr-FR'),
      endDate: oneYearLater.toLocaleDateString('fr-FR'),
      cancellationUrl: 'https://anr.lovable.app/account',
      cguUrl: 'https://anr.lovable.app/cgu',
      retractationDeadline: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
      supportEmail: 'contact@soqotomobil.com',
    };

    let htmlContent: string;
    let subject: string;

    if (template && !templateError) {
      console.log("[SEND-CONFIRMATION] Using template from database");
      htmlContent = replaceVariables(template.html_content, templateVariables);
      subject = replaceVariables(template.subject, templateVariables);
    } else {
      console.log("[SEND-CONFIRMATION] Template not found, using fallback");
      subject = `✅ Confirmation de votre abonnement ANR - ${anrCode}`;

      const domingLine = domingQuantity > 0 
        ? `<tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e5e5;">Doming(s) ANR (${domingQuantity}x)</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right;">${domingAmount.toFixed(2)} €</td>
          </tr>`
        : '';

      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmation de votre abonnement ANR</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Bienvenue chez ANR !</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Votre abonnement est maintenant actif</p>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
        Bonjour <strong>${firstName} ${lastName}</strong>,
      </p>
      
      <p style="font-size: 16px; color: #333; margin-bottom: 25px;">
        Merci pour votre confiance ! Votre abonnement ANR (Adresse Numérique Résidentielle) a été activé avec succès.
      </p>
      
      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
        <h2 style="color: #0ea5e9; margin: 0 0 15px 0; font-size: 18px;">📍 Détails de votre habitation</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666;">Code ANR :</td>
            <td style="padding: 8px 0; color: #333; font-weight: bold; font-family: monospace; font-size: 18px;">${anrCode}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Habitation :</td>
            <td style="padding: 8px 0; color: #333;">${habitationName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Adresse :</td>
            <td style="padding: 8px 0; color: #333;">${address}</td>
          </tr>
        </table>
      </div>
      
      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
        <h2 style="color: #0ea5e9; margin: 0 0 15px 0; font-size: 18px;">💳 Récapitulatif de paiement</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e5e5;">Abonnement annuel ANR</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right;">${subscriptionAmount.toFixed(2)} €</td>
          </tr>
          ${domingLine}
          <tr style="font-weight: bold; font-size: 18px;">
            <td style="padding: 12px; color: #333;">Total payé</td>
            <td style="padding: 12px; text-align: right; color: #0ea5e9;">${totalAmount.toFixed(2)} €</td>
          </tr>
        </table>
      </div>
      
      <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin-bottom: 25px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>📦 Livraison de votre Doming</strong><br>
          Votre badge Doming (QR code + puce NFC) sera expédié sous 48h à l'adresse indiquée.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="https://anr.lovable.app" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; padding: 14px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
          Accéder à mon espace ANR
        </a>
      </div>
      
      <p style="font-size: 14px; color: #666; margin-top: 30px; text-align: center;">
        Des questions ? Contactez-nous à <a href="mailto:contact@soqotomobil.com" style="color: #0ea5e9;">contact@soqotomobil.com</a>
      </p>
    </div>
    
    <p style="text-align: center; font-size: 12px; color: #999; margin-top: 20px;">
      © 2024 ANR - Adresse Numérique Résidentielle<br>
      Cet email a été envoyé automatiquement suite à votre inscription.
    </p>
  </div>
</body>
</html>
      `;
    }

    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");

    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new Error("SMTP configuration missing");
    }

    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: true,
        auth: {
          username: smtpUser,
          password: smtpPass,
        },
      },
    });

    await client.send({
      from: smtpUser,
      to: email,
      subject: subject,
      content: "auto",
      html: htmlContent,
    });

    await client.close();

    // Log sent document
    await supabase.from('sent_documents').insert({
      template_key: 'subscription_confirmation',
      recipient_email: email,
      subject: subject,
      html_snapshot: htmlContent,
      status: 'sent',
      metadata: { anrCode, totalAmount, planType }
    });

    console.log("[SEND-CONFIRMATION] Email sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[SEND-CONFIRMATION] ERROR:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});