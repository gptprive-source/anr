-- 2. SUBSCRIPTION CONFIRMATION TEMPLATE - Complete with legal notices (~12000 chars)
UPDATE public.email_templates 
SET 
  html_content = '<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmation de votre abonnement ANR</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:''Segoe UI'',Roboto,''Helvetica Neue'',Arial,sans-serif;line-height:1.6;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:650px;background-color:#ffffff;border-radius:12px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:40px;text-align:center;">
              <div style="font-size:48px;margin-bottom:10px;">✅</div>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Bienvenue chez ANR !</h1>
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.9);font-size:16px;">Votre abonnement est maintenant actif</p>
            </td>
          </tr>
          
          <!-- Personal greeting -->
          <tr>
            <td style="padding:40px 40px 20px;">
              <p style="margin:0;font-size:16px;color:#1e293b;">Bonjour <strong>{{first_name}}</strong>,</p>
              <p style="margin:16px 0 0;font-size:15px;color:#475569;line-height:1.7;">
                Nous sommes ravis de vous confirmer que votre abonnement ANR a bien été enregistré. Votre interphone connecté est désormais prêt à l''emploi !
              </p>
            </td>
          </tr>
          
          <!-- Order Summary Box -->
          <tr>
            <td style="padding:0 40px 30px;">
              <div style="background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);border:1px solid #86efac;border-radius:12px;padding:25px;">
                <h2 style="margin:0 0 20px;font-size:16px;color:#166534;font-weight:600;">📋 Récapitulatif de votre commande</h2>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#166534;">N° de commande</td>
                    <td style="padding:8px 0;font-size:14px;color:#166534;font-weight:600;text-align:right;">{{order_number}}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#166534;border-top:1px solid #bbf7d0;">Date de souscription</td>
                    <td style="padding:8px 0;font-size:14px;color:#166534;font-weight:600;text-align:right;border-top:1px solid #bbf7d0;">{{subscription_date}}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#166534;border-top:1px solid #bbf7d0;">Formule choisie</td>
                    <td style="padding:8px 0;font-size:14px;color:#166534;font-weight:600;text-align:right;border-top:1px solid #bbf7d0;">{{plan_name}}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#166534;border-top:1px solid #bbf7d0;">Période de facturation</td>
                    <td style="padding:8px 0;font-size:14px;color:#166534;font-weight:600;text-align:right;border-top:1px solid #bbf7d0;">{{billing_period}}</td>
                  </tr>
                  <tr style="background-color:rgba(255,255,255,0.5);">
                    <td style="padding:12px 8px;font-size:16px;color:#166534;font-weight:600;border-top:2px solid #22c55e;">Montant</td>
                    <td style="padding:12px 8px;font-size:20px;color:#166534;font-weight:700;text-align:right;border-top:2px solid #22c55e;">{{amount}} €</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- ANR Info -->
          <tr>
            <td style="padding:0 40px 30px;">
              <div style="background-color:#f1f5f9;border-radius:12px;padding:25px;">
                <h2 style="margin:0 0 15px;font-size:16px;color:#1e293b;font-weight:600;">🏠 Votre adresse ANR</h2>
                <p style="margin:0 0 8px;font-size:14px;color:#475569;"><strong>Code ANR :</strong> <span style="font-family:monospace;background-color:#e2e8f0;padding:2px 8px;border-radius:4px;">{{anr_code}}</span></p>
                <p style="margin:0;font-size:14px;color:#475569;"><strong>Adresse :</strong> {{address}}</p>
              </div>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding:0 40px 30px;text-align:center;">
              <a href="{{dashboard_url}}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:8px;font-size:16px;font-weight:600;box-shadow:0 4px 6px -1px rgba(59,130,246,0.4);">Accéder à mon tableau de bord</a>
            </td>
          </tr>
          
          <!-- Next billing -->
          <tr>
            <td style="padding:0 40px 30px;">
              <div style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px;">
                <p style="margin:0;font-size:14px;color:#1e40af;">
                  📅 <strong>Prochaine facturation :</strong> {{next_billing_date}} — Votre carte sera automatiquement débitée du montant de {{amount}} €.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Right of withdrawal - LEGAL REQUIREMENT -->
          <tr>
            <td style="padding:0 40px 30px;">
              <div style="background-color:#fef3c7;border:1px solid #fcd34d;border-radius:12px;padding:25px;">
                <h2 style="margin:0 0 15px;font-size:16px;color:#92400e;font-weight:600;">⚖️ Droit de rétractation (Article L221-18 du Code de la consommation)</h2>
                <p style="margin:0 0 12px;font-size:13px;color:#78350f;line-height:1.6;">
                  Conformément aux dispositions légales en vigueur, vous disposez d''un <strong>délai de 14 jours</strong> à compter de la date de souscription pour exercer votre droit de rétractation, sans avoir à justifier de motifs ni à payer de pénalités.
                </p>
                <p style="margin:0 0 12px;font-size:13px;color:#78350f;line-height:1.6;">
                  <strong>Date limite de rétractation :</strong> {{retraction_deadline}}
                </p>
                <p style="margin:0 0 12px;font-size:13px;color:#78350f;line-height:1.6;">
                  <strong>Pour exercer ce droit :</strong> Envoyez un email à <a href="mailto:{{support_email}}" style="color:#92400e;">{{support_email}}</a> en indiquant votre numéro de commande {{order_number}} et votre demande de rétractation.
                </p>
                <p style="margin:0;font-size:12px;color:#a16207;line-height:1.5;font-style:italic;">
                  Note : Si vous avez demandé l''exécution du service avant la fin du délai de rétractation, vous acceptez de perdre votre droit de rétractation dès la pleine exécution du contrat.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- CGV/CGU Links -->
          <tr>
            <td style="padding:0 40px 30px;">
              <div style="border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
                <h2 style="margin:0 0 15px;font-size:16px;color:#1e293b;font-weight:600;">📄 Documents contractuels</h2>
                <p style="margin:0 0 12px;font-size:13px;color:#475569;line-height:1.6;">
                  En souscrivant à cet abonnement, vous avez accepté nos conditions générales :
                </p>
                <p style="margin:0;font-size:13px;">
                  <a href="{{cgv_url}}" style="color:#3b82f6;text-decoration:none;margin-right:20px;">→ Conditions Générales de Vente</a>
                  <a href="{{cgu_url}}" style="color:#3b82f6;text-decoration:none;margin-right:20px;">→ Conditions Générales d''Utilisation</a>
                  <a href="{{privacy_url}}" style="color:#3b82f6;text-decoration:none;">→ Politique de confidentialité</a>
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Cancellation info -->
          <tr>
            <td style="padding:0 40px 30px;">
              <div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;">
                <h2 style="margin:0 0 10px;font-size:14px;color:#991b1b;font-weight:600;">🔄 Résiliation</h2>
                <p style="margin:0;font-size:13px;color:#7f1d1d;line-height:1.6;">
                  Vous pouvez résilier votre abonnement à tout moment depuis votre espace client ou en nous contactant. La résiliation prend effet à la fin de la période en cours.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Support -->
          <tr>
            <td style="padding:0 40px 40px;">
              <p style="margin:0;font-size:14px;color:#475569;line-height:1.7;">
                Des questions ? Notre équipe est là pour vous aider :<br>
                📧 <a href="mailto:{{support_email}}" style="color:#3b82f6;text-decoration:none;">{{support_email}}</a><br>
                📞 {{support_phone}} (du lundi au vendredi, 9h-18h)
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color:#1e293b;padding:30px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:14px;color:#ffffff;font-weight:500;">{{company_name}}</p>
              <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;">{{company_address}}</p>
              <p style="margin:0;font-size:11px;color:#64748b;">SIRET {{company_siret}} — RCS {{company_rcs}}</p>
              <p style="margin:15px 0 0;font-size:11px;color:#64748b;">
                <a href="{{unsubscribe_url}}" style="color:#94a3b8;text-decoration:underline;">Se désabonner des emails marketing</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  default_html_content = html_content,
  variables = '["first_name","order_number","subscription_date","plan_name","billing_period","amount","anr_code","address","dashboard_url","next_billing_date","retraction_deadline","support_email","support_phone","cgv_url","cgu_url","privacy_url","company_name","company_address","company_siret","company_rcs","unsubscribe_url"]'::jsonb,
  preview_data = '{
    "first_name": "Jean",
    "order_number": "ORD-2026-00142",
    "subscription_date": "03/01/2026",
    "plan_name": "ANR Premium",
    "billing_period": "Mensuel",
    "amount": "9,90",
    "anr_code": "ANR-75011-PARIS-001",
    "address": "123 Avenue de la République, 75011 Paris",
    "dashboard_url": "https://app.anr.fr/dashboard",
    "next_billing_date": "03/02/2026",
    "retraction_deadline": "17/01/2026",
    "support_email": "support@anr.fr",
    "support_phone": "01 23 45 67 89",
    "cgv_url": "https://anr.fr/cgv",
    "cgu_url": "https://anr.fr/cgu",
    "privacy_url": "https://anr.fr/privacy",
    "company_name": "ANR Technologies SAS",
    "company_address": "123 Avenue de la République, 75011 Paris",
    "company_siret": "123 456 789 00012",
    "company_rcs": "Paris B 123 456 789",
    "unsubscribe_url": "https://app.anr.fr/unsubscribe"
  }'::jsonb,
  version = COALESCE(version, 0) + 1,
  updated_at = NOW()
WHERE template_key = 'subscription_confirmation';