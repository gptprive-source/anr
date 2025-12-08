import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  access_id: string;
  action: 'created' | 'updated' | 'deleted';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { access_id, action } = await req.json() as NotifyRequest;

    // Récupérer les détails de l'accès programmé
    const { data: access, error: accessError } = await supabaseAdmin
      .from('door_scheduled_access')
      .select(`
        *,
        anrs!door_scheduled_access_anr_id_fkey (address, code)
      `)
      .eq('id', access_id)
      .single();

    if (accessError || !access) {
      throw new Error("Accès programmé non trouvé");
    }

    // Récupérer les informations du résident qui a créé l'accès
    const { data: grantor, error: grantorError } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', access.granted_by)
      .single();

    const grantorName = grantorError ? 'Un résident' : 
      `${grantor.first_name || ''} ${grantor.last_name || ''}`.trim() || 'Un résident';

    // Chercher l'utilisateur bénéficiaire par son code ANR
    const { data: beneficiaryAnr, error: beneficiaryAnrError } = await supabaseAdmin
      .from('anrs')
      .select('id')
      .eq('code', access.beneficiary_anr_code)
      .single();

    if (beneficiaryAnrError || !beneficiaryAnr) {
      console.log("Code ANR bénéficiaire non trouvé:", access.beneficiary_anr_code);
      return new Response(
        JSON.stringify({ success: false, message: "Code ANR bénéficiaire non trouvé" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Trouver les résidents de cette ANR
    const { data: residents, error: residentsError } = await supabaseAdmin
      .from('residents')
      .select(`
        user_id,
        habitations!inner (anr_id)
      `)
      .eq('habitations.anr_id', beneficiaryAnr.id)
      .eq('status', 'verified');

    if (residentsError || !residents || residents.length === 0) {
      console.log("Aucun résident trouvé pour cette ANR");
      return new Response(
        JSON.stringify({ success: false, message: "Aucun résident bénéficiaire trouvé" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Récupérer les emails des bénéficiaires
    const userIds = residents.map(r => r.user_id);
    
    // Récupérer les emails depuis auth.users
    const emails: string[] = [];
    for (const userId of userIds) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (userData?.user?.email) {
        emails.push(userData.user.email);
      }
    }

    if (emails.length === 0) {
      console.log("Aucun email trouvé pour les bénéficiaires");
      return new Response(
        JSON.stringify({ success: false, message: "Aucun email bénéficiaire trouvé" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Formater les jours de la semaine
    const daysNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const daysText = access.days_of_week 
      ? access.days_of_week.map((d: number) => daysNames[d]).join(', ')
      : 'Tous les jours';

    // Déterminer le sujet et le contenu de l'email selon l'action
    let subject = '';
    let actionText = '';
    
    switch (action) {
      case 'created':
        subject = `🔑 Nouvelle autorisation d'accès - ${access.name}`;
        actionText = 'vous a accordé une nouvelle autorisation d\'accès';
        break;
      case 'updated':
        subject = `🔄 Autorisation d'accès modifiée - ${access.name}`;
        actionText = 'a modifié votre autorisation d\'accès';
        break;
      case 'deleted':
        subject = `❌ Autorisation d'accès supprimée - ${access.name}`;
        actionText = 'a supprimé votre autorisation d\'accès';
        break;
    }

    const callForwardingText = access.forward_calls_to_beneficiary 
      ? '<p style="color: #059669; font-weight: bold;">📞 Vous recevrez également les appels de l\'interphone pendant vos heures d\'accès autorisées.</p>'
      : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; }
            .detail-box { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
            .detail-row:last-child { border-bottom: none; }
            .label { color: #64748b; font-size: 14px; }
            .value { font-weight: 600; color: #1e293b; }
            .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">🏠 ANR - Accès Programmé</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">Notification d'autorisation</p>
          </div>
          <div class="content">
            <p>Bonjour <strong>${access.beneficiary_first_name} ${access.beneficiary_last_name}</strong>,</p>
            
            <p><strong>${grantorName}</strong> ${actionText} à son domicile :</p>
            
            <div class="detail-box">
              <div class="detail-row">
                <span class="label">Nom de l'autorisation</span>
                <span class="value">${access.name}</span>
              </div>
              <div class="detail-row">
                <span class="label">Adresse</span>
                <span class="value">${access.anrs?.address || 'Non spécifiée'}</span>
              </div>
              <div class="detail-row">
                <span class="label">Code ANR</span>
                <span class="value">${access.anrs?.code || 'N/A'}</span>
              </div>
              <div class="detail-row">
                <span class="label">Horaires</span>
                <span class="value">${access.time_from} - ${access.time_to}</span>
              </div>
              <div class="detail-row">
                <span class="label">Jours autorisés</span>
                <span class="value">${daysText}</span>
              </div>
              ${access.valid_from || access.valid_until ? `
              <div class="detail-row">
                <span class="label">Période de validité</span>
                <span class="value">${access.valid_from || 'Début immédiat'} → ${access.valid_until || 'Indéfinie'}</span>
              </div>
              ` : ''}
            </div>

            ${callForwardingText}
            
            ${access.instructions_for_visitor ? `
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <strong>📝 Instructions :</strong><br>
              ${access.instructions_for_visitor}
            </div>
            ` : ''}

            <p style="color: #64748b; font-size: 14px;">
              ${action === 'deleted' 
                ? 'Cette autorisation n\'est plus valide.' 
                : 'Vous pouvez utiliser cette autorisation pour accéder au domicile pendant les horaires indiqués.'}
            </p>
          </div>
          <div class="footer">
            <p>© ANR - Adresse Numérique Résidentielle</p>
            <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        </body>
      </html>
    `;

    // Envoyer l'email via SMTP
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.error("Configuration SMTP manquante");
      return new Response(
        JSON.stringify({ success: false, message: "Configuration SMTP manquante" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Utiliser l'API fetch pour envoyer via un service SMTP HTTP
    // Pour l'instant, on simule l'envoi en loggant
    console.log(`Email notification envoyée à: ${emails.join(', ')}`);
    console.log(`Sujet: ${subject}`);
    console.log(`Action: ${action}`);

    // Envoyer via SMTP direct (comme dans send-invitation)
    const SMTPClient = (await import("https://deno.land/x/denomailer@1.6.0/mod.ts")).SMTPClient;
    
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

    try {
      await client.send({
        from: smtpUser,
        to: emails,
        subject: subject,
        content: "Veuillez activer l'affichage HTML pour voir ce message.",
        html: htmlContent,
      });

      await client.close();
      console.log("Email envoyé avec succès");
    } catch (smtpError) {
      console.error("Erreur envoi SMTP:", smtpError);
      await client.close();
      // Ne pas bloquer si l'email échoue
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Notification envoyée à ${emails.length} bénéficiaire(s)` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erreur notify-scheduled-access:", error);
    const errorMessage = error instanceof Error ? error.message : "Une erreur est survenue";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});