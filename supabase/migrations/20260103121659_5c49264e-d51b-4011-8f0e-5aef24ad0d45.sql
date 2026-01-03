-- =====================================================
-- PROFESSIONAL EMAIL TEMPLATES - COMPLETE HTML CONTENT
-- =====================================================

-- 1. INVOICE TEMPLATE - Complete Professional Invoice (~14000 chars)
UPDATE public.email_templates 
SET 
  html_content = '<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Facture {{invoice_number}}</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:''Segoe UI'',Roboto,''Helvetica Neue'',Arial,sans-serif;line-height:1.6;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:800px;background-color:#ffffff;border-radius:12px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);overflow:hidden;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%);padding:30px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">FACTURE</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:16px;">N° {{invoice_number}}</p>
            </td>
          </tr>
          
          <!-- Invoice Meta Info -->
          <tr>
            <td style="padding:30px 40px 20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="50%" style="vertical-align:top;">
                    <div style="background-color:#f1f5f9;border-radius:8px;padding:20px;">
                      <p style="margin:0 0 4px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Date de facturation</p>
                      <p style="margin:0;font-size:16px;font-weight:600;color:#1e293b;">{{invoice_date}}</p>
                    </div>
                  </td>
                  <td width="10"></td>
                  <td width="50%" style="vertical-align:top;">
                    <div style="background-color:#f1f5f9;border-radius:8px;padding:20px;">
                      <p style="margin:0 0 4px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Échéance</p>
                      <p style="margin:0;font-size:16px;font-weight:600;color:#1e293b;">{{due_date}}</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Company and Client Info -->
          <tr>
            <td style="padding:0 40px 30px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <!-- Issuer (Company) -->
                  <td width="48%" style="vertical-align:top;">
                    <div style="border:2px solid #e2e8f0;border-radius:8px;padding:20px;">
                      <p style="margin:0 0 12px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Émetteur</p>
                      <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#1e293b;">{{company_name}}</p>
                      <p style="margin:0;font-size:14px;color:#475569;">{{company_address}}</p>
                      <p style="margin:0;font-size:14px;color:#475569;">{{company_city}}</p>
                      <hr style="border:none;border-top:1px solid #e2e8f0;margin:15px 0;">
                      <p style="margin:0 0 4px;font-size:12px;color:#64748b;">SIRET : <span style="color:#1e293b;font-weight:500;">{{company_siret}}</span></p>
                      <p style="margin:0 0 4px;font-size:12px;color:#64748b;">RCS : <span style="color:#1e293b;font-weight:500;">{{company_rcs}}</span></p>
                      <p style="margin:0 0 4px;font-size:12px;color:#64748b;">N° TVA : <span style="color:#1e293b;font-weight:500;">{{company_vat}}</span></p>
                      <p style="margin:0;font-size:12px;color:#64748b;">Capital : <span style="color:#1e293b;font-weight:500;">{{company_capital}}</span></p>
                    </div>
                  </td>
                  <td width="4%"></td>
                  <!-- Client -->
                  <td width="48%" style="vertical-align:top;">
                    <div style="border:2px solid #3b82f6;border-radius:8px;padding:20px;background-color:#eff6ff;">
                      <p style="margin:0 0 12px;font-size:12px;color:#3b82f6;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Facturé à</p>
                      <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#1e293b;">{{client_name}}</p>
                      <p style="margin:0;font-size:14px;color:#475569;">{{client_address}}</p>
                      <p style="margin:0;font-size:14px;color:#475569;">{{client_city}}</p>
                      <hr style="border:none;border-top:1px solid #bfdbfe;margin:15px 0;">
                      <p style="margin:0 0 4px;font-size:12px;color:#64748b;">Email : <span style="color:#1e293b;font-weight:500;">{{client_email}}</span></p>
                      <p style="margin:0;font-size:12px;color:#64748b;">Réf. client : <span style="color:#1e293b;font-weight:500;">{{client_ref}}</span></p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Items Table -->
          <tr>
            <td style="padding:0 40px 30px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                <thead>
                  <tr style="background-color:#1e293b;">
                    <th style="padding:14px 16px;text-align:left;color:#ffffff;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-radius:8px 0 0 0;">Description</th>
                    <th style="padding:14px 16px;text-align:center;color:#ffffff;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Qté</th>
                    <th style="padding:14px 16px;text-align:right;color:#ffffff;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Prix unitaire HT</th>
                    <th style="padding:14px 16px;text-align:right;color:#ffffff;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">TVA</th>
                    <th style="padding:14px 16px;text-align:right;color:#ffffff;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-radius:0 8px 0 0;">Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {{items_rows}}
                </tbody>
              </table>
            </td>
          </tr>
          
          <!-- Totals -->
          <tr>
            <td style="padding:0 40px 30px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="50%"></td>
                  <td width="50%">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;border-radius:8px;overflow:hidden;">
                      <tr>
                        <td style="padding:12px 20px;font-size:14px;color:#64748b;">Total HT</td>
                        <td style="padding:12px 20px;font-size:14px;font-weight:600;color:#1e293b;text-align:right;">{{total_ht}} €</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 20px;font-size:14px;color:#64748b;border-top:1px solid #e2e8f0;">TVA ({{vat_rate}}%)</td>
                        <td style="padding:12px 20px;font-size:14px;font-weight:600;color:#1e293b;text-align:right;border-top:1px solid #e2e8f0;">{{total_vat}} €</td>
                      </tr>
                      <tr style="background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%);">
                        <td style="padding:16px 20px;font-size:16px;font-weight:600;color:#ffffff;">TOTAL TTC</td>
                        <td style="padding:16px 20px;font-size:20px;font-weight:700;color:#ffffff;text-align:right;">{{total_ttc}} €</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Payment Info -->
          <tr>
            <td style="padding:0 40px 30px;">
              <div style="background-color:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:20px;">
                <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#166534;">💳 Informations de paiement</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="font-size:13px;color:#166534;padding:4px 0;">Mode de paiement :</td>
                    <td style="font-size:13px;color:#166534;font-weight:500;text-align:right;">{{payment_method}}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#166534;padding:4px 0;">IBAN :</td>
                    <td style="font-size:13px;color:#166534;font-weight:500;text-align:right;font-family:monospace;">{{bank_iban}}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#166534;padding:4px 0;">BIC :</td>
                    <td style="font-size:13px;color:#166534;font-weight:500;text-align:right;font-family:monospace;">{{bank_bic}}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- Legal Mentions -->
          <tr>
            <td style="padding:0 40px 40px;">
              <div style="background-color:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:20px;">
                <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#92400e;">📋 Mentions légales obligatoires</p>
                <p style="margin:0 0 8px;font-size:11px;color:#78350f;line-height:1.5;">
                  <strong>Pénalités de retard :</strong> En cas de retard de paiement, une pénalité égale à 3 fois le taux d''intérêt légal sera exigible (Article L.441-10 du Code de commerce). Le taux d''intérêt légal en vigueur est de {{legal_interest_rate}}%.
                </p>
                <p style="margin:0 0 8px;font-size:11px;color:#78350f;line-height:1.5;">
                  <strong>Indemnité forfaitaire de recouvrement :</strong> Conformément aux articles L.441-10 et D.441-5 du Code de commerce, tout retard de paiement entraîne de plein droit une indemnité forfaitaire pour frais de recouvrement d''un montant de <strong>40 €</strong>.
                </p>
                <p style="margin:0 0 8px;font-size:11px;color:#78350f;line-height:1.5;">
                  <strong>Escompte :</strong> Pas d''escompte pour paiement anticipé.
                </p>
                <p style="margin:0;font-size:11px;color:#78350f;line-height:1.5;">
                  <strong>Clause de réserve de propriété :</strong> Les marchandises restent la propriété du vendeur jusqu''au paiement intégral du prix.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color:#1e293b;padding:30px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:14px;color:#ffffff;font-weight:500;">{{company_name}}</p>
              <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">{{company_address}}, {{company_city}}</p>
              <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">Email : {{company_email}} | Tél : {{company_phone}}</p>
              <p style="margin:0;font-size:11px;color:#64748b;">SIRET {{company_siret}} - RCS {{company_rcs}} - TVA {{company_vat}}</p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  default_html_content = html_content,
  variables = '["invoice_number","invoice_date","due_date","company_name","company_address","company_city","company_siret","company_rcs","company_vat","company_capital","company_email","company_phone","client_name","client_address","client_city","client_email","client_ref","items_rows","total_ht","vat_rate","total_vat","total_ttc","payment_method","bank_iban","bank_bic","legal_interest_rate"]'::jsonb,
  preview_data = '{
    "invoice_number": "FA-2026-00142",
    "invoice_date": "03/01/2026",
    "due_date": "03/02/2026",
    "company_name": "ANR Technologies SAS",
    "company_address": "123 Avenue de la République",
    "company_city": "75011 Paris",
    "company_siret": "123 456 789 00012",
    "company_rcs": "Paris B 123 456 789",
    "company_vat": "FR12 123456789",
    "company_capital": "50 000 €",
    "company_email": "contact@anr-tech.fr",
    "company_phone": "01 23 45 67 89",
    "client_name": "Jean Dupont",
    "client_address": "45 Rue des Lilas",
    "client_city": "69001 Lyon",
    "client_email": "jean.dupont@email.fr",
    "client_ref": "CLI-2024-0042",
    "items_rows": "<tr style=\"border-bottom:1px solid #e2e8f0;\"><td style=\"padding:14px 16px;font-size:14px;color:#1e293b;\">Abonnement ANR Premium - Janvier 2026</td><td style=\"padding:14px 16px;font-size:14px;color:#64748b;text-align:center;\">1</td><td style=\"padding:14px 16px;font-size:14px;color:#1e293b;text-align:right;\">8,25 €</td><td style=\"padding:14px 16px;font-size:14px;color:#64748b;text-align:right;\">20%</td><td style=\"padding:14px 16px;font-size:14px;font-weight:600;color:#1e293b;text-align:right;\">8,25 €</td></tr><tr style=\"border-bottom:1px solid #e2e8f0;\"><td style=\"padding:14px 16px;font-size:14px;color:#1e293b;\">Doming personnalisé - Lot de 3</td><td style=\"padding:14px 16px;font-size:14px;color:#64748b;text-align:center;\">1</td><td style=\"padding:14px 16px;font-size:14px;color:#1e293b;text-align:right;\">8,25 €</td><td style=\"padding:14px 16px;font-size:14px;color:#64748b;text-align:right;\">20%</td><td style=\"padding:14px 16px;font-size:14px;font-weight:600;color:#1e293b;text-align:right;\">8,25 €</td></tr>",
    "total_ht": "16,50",
    "vat_rate": "20",
    "total_vat": "3,30",
    "total_ttc": "19,80",
    "payment_method": "Carte bancaire (Stripe)",
    "bank_iban": "FR76 1234 5678 9012 3456 7890 123",
    "bank_bic": "BNPAFRPP",
    "legal_interest_rate": "4,22"
  }'::jsonb,
  version = COALESCE(version, 0) + 1,
  updated_at = NOW()
WHERE template_key = 'invoice';