-- 3. RGPD EXPORT TEMPLATE - Complete with all legal requirements (~15000 chars)
UPDATE public.email_templates 
SET 
  html_content = '<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Export de vos données personnelles - RGPD</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:''Segoe UI'',Roboto,''Helvetica Neue'',Arial,sans-serif;line-height:1.6;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:700px;background-color:#ffffff;border-radius:12px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);overflow:hidden;">
          
          <!-- Official Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#8b5cf6 0%,#6d28d9 100%);padding:40px;text-align:center;">
              <div style="font-size:48px;margin-bottom:10px;">🔐</div>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">EXERCICE DU DROIT D''ACCÈS</h1>
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Article 15 du Règlement (UE) 2016/679 (RGPD)</p>
            </td>
          </tr>
          
          <!-- Request Summary -->
          <tr>
            <td style="padding:40px 40px 20px;">
              <p style="margin:0 0 8px;font-size:16px;color:#1e293b;">Bonjour <strong>{{first_name}} {{last_name}}</strong>,</p>
              <p style="margin:16px 0 0;font-size:15px;color:#475569;line-height:1.7;">
                Suite à votre demande du <strong>{{request_date}}</strong>, nous vous transmettons conformément à l''article 15 du RGPD l''ensemble des données personnelles que nous détenons vous concernant.
              </p>
            </td>
          </tr>
          
          <!-- Request Info Box -->
          <tr>
            <td style="padding:0 40px 30px;">
              <div style="background-color:#f1f5f9;border-radius:12px;padding:20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="font-size:14px;color:#64748b;padding:4px 0;">N° de demande</td>
                    <td style="font-size:14px;color:#1e293b;font-weight:600;text-align:right;font-family:monospace;">{{request_id}}</td>
                  </tr>
                  <tr>
                    <td style="font-size:14px;color:#64748b;padding:4px 0;">Date de la demande</td>
                    <td style="font-size:14px;color:#1e293b;font-weight:600;text-align:right;">{{request_date}}</td>
                  </tr>
                  <tr>
                    <td style="font-size:14px;color:#64748b;padding:4px 0;">Date de réponse</td>
                    <td style="font-size:14px;color:#1e293b;font-weight:600;text-align:right;">{{response_date}}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- Section 1: Identity Data -->
          <tr>
            <td style="padding:0 40px 25px;">
              <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                <div style="background-color:#1e293b;padding:15px 20px;">
                  <h2 style="margin:0;font-size:15px;color:#ffffff;font-weight:600;">👤 1. Données d''identification</h2>
                </div>
                <div style="padding:20px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;width:40%;">Nom</td><td style="padding:6px 0;font-size:13px;color:#1e293b;font-weight:500;">{{last_name}}</td></tr>
                    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;border-top:1px solid #f1f5f9;">Prénom</td><td style="padding:6px 0;font-size:13px;color:#1e293b;font-weight:500;border-top:1px solid #f1f5f9;">{{first_name}}</td></tr>
                    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;border-top:1px solid #f1f5f9;">Email</td><td style="padding:6px 0;font-size:13px;color:#1e293b;font-weight:500;border-top:1px solid #f1f5f9;">{{email}}</td></tr>
                    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;border-top:1px solid #f1f5f9;">Téléphone</td><td style="padding:6px 0;font-size:13px;color:#1e293b;font-weight:500;border-top:1px solid #f1f5f9;">{{phone}}</td></tr>
                    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;border-top:1px solid #f1f5f9;">Date de création du compte</td><td style="padding:6px 0;font-size:13px;color:#1e293b;font-weight:500;border-top:1px solid #f1f5f9;">{{account_created_at}}</td></tr>
                  </table>
                  <div style="margin-top:15px;padding:12px;background-color:#f8fafc;border-radius:6px;">
                    <p style="margin:0;font-size:11px;color:#64748b;"><strong>Finalité :</strong> Gestion de votre compte et relation client</p>
                    <p style="margin:4px 0 0;font-size:11px;color:#64748b;"><strong>Base légale :</strong> Exécution du contrat (Art. 6.1.b RGPD)</p>
                    <p style="margin:4px 0 0;font-size:11px;color:#64748b;"><strong>Durée de conservation :</strong> Durée de la relation contractuelle + 5 ans (obligations légales)</p>
                  </div>
                </div>
              </div>
            </td>
          </tr>
          
          <!-- Section 2: Connection Data -->
          <tr>
            <td style="padding:0 40px 25px;">
              <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                <div style="background-color:#1e293b;padding:15px 20px;">
                  <h2 style="margin:0;font-size:15px;color:#ffffff;font-weight:600;">🔌 2. Données de connexion</h2>
                </div>
                <div style="padding:20px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;width:40%;">Dernière connexion</td><td style="padding:6px 0;font-size:13px;color:#1e293b;font-weight:500;">{{last_login}}</td></tr>
                    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;border-top:1px solid #f1f5f9;">Appareils enregistrés</td><td style="padding:6px 0;font-size:13px;color:#1e293b;font-weight:500;border-top:1px solid #f1f5f9;">{{devices_count}}</td></tr>
                    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;border-top:1px solid #f1f5f9;">Sessions actives</td><td style="padding:6px 0;font-size:13px;color:#1e293b;font-weight:500;border-top:1px solid #f1f5f9;">{{active_sessions}}</td></tr>
                  </table>
                  <div style="margin-top:15px;padding:12px;background-color:#f8fafc;border-radius:6px;">
                    <p style="margin:0;font-size:11px;color:#64748b;"><strong>Finalité :</strong> Sécurité du compte et détection des fraudes</p>
                    <p style="margin:4px 0 0;font-size:11px;color:#64748b;"><strong>Base légale :</strong> Intérêt légitime (Art. 6.1.f RGPD)</p>
                    <p style="margin:4px 0 0;font-size:11px;color:#64748b;"><strong>Durée de conservation :</strong> 12 mois glissants</p>
                  </div>
                </div>
              </div>
            </td>
          </tr>
          
          <!-- Section 3: Usage Data -->
          <tr>
            <td style="padding:0 40px 25px;">
              <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                <div style="background-color:#1e293b;padding:15px 20px;">
                  <h2 style="margin:0;font-size:15px;color:#ffffff;font-weight:600;">📊 3. Données d''utilisation du service</h2>
                </div>
                <div style="padding:20px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;width:40%;">Nombre d''appels reçus</td><td style="padding:6px 0;font-size:13px;color:#1e293b;font-weight:500;">{{calls_received}}</td></tr>
                    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;border-top:1px solid #f1f5f9;">Ouvertures de porte</td><td style="padding:6px 0;font-size:13px;color:#1e293b;font-weight:500;border-top:1px solid #f1f5f9;">{{door_openings}}</td></tr>
                    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;border-top:1px solid #f1f5f9;">Messages envoyés/reçus</td><td style="padding:6px 0;font-size:13px;color:#1e293b;font-weight:500;border-top:1px solid #f1f5f9;">{{messages_count}}</td></tr>
                    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;border-top:1px solid #f1f5f9;">Accès programmés créés</td><td style="padding:6px 0;font-size:13px;color:#1e293b;font-weight:500;border-top:1px solid #f1f5f9;">{{scheduled_access_count}}</td></tr>
                  </table>
                  <div style="margin-top:15px;padding:12px;background-color:#f8fafc;border-radius:6px;">
                    <p style="margin:0;font-size:11px;color:#64748b;"><strong>Finalité :</strong> Fourniture du service ANR</p>
                    <p style="margin:4px 0 0;font-size:11px;color:#64748b;"><strong>Base légale :</strong> Exécution du contrat (Art. 6.1.b RGPD)</p>
                    <p style="margin:4px 0 0;font-size:11px;color:#64748b;"><strong>Durée de conservation :</strong> Durée de l''abonnement + 1 an</p>
                  </div>
                </div>
              </div>
            </td>
          </tr>
          
          <!-- Section 4: Contract Data -->
          <tr>
            <td style="padding:0 40px 25px;">
              <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                <div style="background-color:#1e293b;padding:15px 20px;">
                  <h2 style="margin:0;font-size:15px;color:#ffffff;font-weight:600;">📄 4. Données contractuelles</h2>
                </div>
                <div style="padding:20px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;width:40%;">Abonnement actuel</td><td style="padding:6px 0;font-size:13px;color:#1e293b;font-weight:500;">{{current_plan}}</td></tr>
                    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;border-top:1px solid #f1f5f9;">Date de début</td><td style="padding:6px 0;font-size:13px;color:#1e293b;font-weight:500;border-top:1px solid #f1f5f9;">{{subscription_start}}</td></tr>
                    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;border-top:1px solid #f1f5f9;">Montant mensuel</td><td style="padding:6px 0;font-size:13px;color:#1e293b;font-weight:500;border-top:1px solid #f1f5f9;">{{monthly_amount}} €</td></tr>
                    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;border-top:1px solid #f1f5f9;">Nombre de factures</td><td style="padding:6px 0;font-size:13px;color:#1e293b;font-weight:500;border-top:1px solid #f1f5f9;">{{invoices_count}}</td></tr>
                  </table>
                  <div style="margin-top:15px;padding:12px;background-color:#f8fafc;border-radius:6px;">
                    <p style="margin:0;font-size:11px;color:#64748b;"><strong>Finalité :</strong> Gestion de la facturation et comptabilité</p>
                    <p style="margin:4px 0 0;font-size:11px;color:#64748b;"><strong>Base légale :</strong> Obligation légale (Art. 6.1.c RGPD)</p>
                    <p style="margin:4px 0 0;font-size:11px;color:#64748b;"><strong>Durée de conservation :</strong> 10 ans (obligations comptables)</p>
                  </div>
                </div>
              </div>
            </td>
          </tr>
          
          <!-- Data Recipients -->
          <tr>
            <td style="padding:0 40px 25px;">
              <div style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px;">
                <h2 style="margin:0 0 15px;font-size:15px;color:#1e40af;font-weight:600;">🔄 Destinataires de vos données</h2>
                <p style="margin:0 0 10px;font-size:13px;color:#1e40af;line-height:1.6;">Vos données sont susceptibles d''être transmises aux catégories de destinataires suivantes :</p>
                <ul style="margin:0;padding-left:20px;font-size:13px;color:#1e40af;line-height:1.8;">
                  <li><strong>Stripe Inc.</strong> — Traitement des paiements (USA, clauses contractuelles types)</li>
                  <li><strong>Supabase Inc.</strong> — Hébergement et base de données (EU)</li>
                  <li><strong>Daily.co</strong> — Appels vidéo (USA, clauses contractuelles types)</li>
                  <li><strong>Prestataire SMTP</strong> — Envoi d''emails transactionnels (EU)</li>
                </ul>
              </div>
            </td>
          </tr>
          
          <!-- Your Rights -->
          <tr>
            <td style="padding:0 40px 25px;">
              <div style="background-color:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:20px;">
                <h2 style="margin:0 0 15px;font-size:15px;color:#166534;font-weight:600;">⚖️ Vos droits</h2>
                <p style="margin:0 0 10px;font-size:13px;color:#166534;line-height:1.6;">Conformément au RGPD, vous disposez des droits suivants :</p>
                <ul style="margin:0;padding-left:20px;font-size:13px;color:#166534;line-height:1.8;">
                  <li><strong>Droit de rectification</strong> — Corriger des données inexactes</li>
                  <li><strong>Droit à l''effacement</strong> — Supprimer vos données ("droit à l''oubli")</li>
                  <li><strong>Droit à la portabilité</strong> — Recevoir vos données dans un format structuré</li>
                  <li><strong>Droit d''opposition</strong> — Vous opposer au traitement de vos données</li>
                  <li><strong>Droit à la limitation</strong> — Limiter l''utilisation de vos données</li>
                </ul>
              </div>
            </td>
          </tr>
          
          <!-- DPO Contact -->
          <tr>
            <td style="padding:0 40px 25px;">
              <div style="border:2px solid #8b5cf6;border-radius:12px;padding:20px;">
                <h2 style="margin:0 0 15px;font-size:15px;color:#6d28d9;font-weight:600;">📬 Contact DPO</h2>
                <p style="margin:0 0 8px;font-size:13px;color:#475569;">Pour toute question relative à vos données personnelles :</p>
                <p style="margin:0 0 4px;font-size:13px;color:#1e293b;"><strong>Délégué à la Protection des Données</strong></p>
                <p style="margin:0 0 4px;font-size:13px;color:#1e293b;">Email : <a href="mailto:{{dpo_email}}" style="color:#6d28d9;">{{dpo_email}}</a></p>
                <p style="margin:0;font-size:13px;color:#1e293b;">Adresse : {{company_address}}</p>
              </div>
            </td>
          </tr>
          
          <!-- CNIL Reclamation -->
          <tr>
            <td style="padding:0 40px 40px;">
              <div style="background-color:#fef3c7;border:1px solid #fcd34d;border-radius:12px;padding:20px;">
                <h2 style="margin:0 0 10px;font-size:14px;color:#92400e;font-weight:600;">🏛️ Réclamation auprès de la CNIL</h2>
                <p style="margin:0;font-size:12px;color:#78350f;line-height:1.6;">
                  Si vous estimez que le traitement de vos données ne respecte pas la réglementation en vigueur, vous pouvez introduire une réclamation auprès de la Commission Nationale de l''Informatique et des Libertés (CNIL) : <a href="https://www.cnil.fr/fr/plaintes" style="color:#92400e;">www.cnil.fr</a>
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color:#1e293b;padding:30px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:14px;color:#ffffff;font-weight:500;">{{company_name}}</p>
              <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;">{{company_address}}</p>
              <p style="margin:0;font-size:11px;color:#64748b;">Ce document est confidentiel et destiné uniquement à {{email}}</p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  default_html_content = html_content,
  variables = '["first_name","last_name","email","phone","request_date","request_id","response_date","account_created_at","last_login","devices_count","active_sessions","calls_received","door_openings","messages_count","scheduled_access_count","current_plan","subscription_start","monthly_amount","invoices_count","dpo_email","company_name","company_address"]'::jsonb,
  preview_data = '{
    "first_name": "Jean",
    "last_name": "Dupont",
    "email": "jean.dupont@email.fr",
    "phone": "+33 6 12 34 56 78",
    "request_date": "28/12/2025",
    "request_id": "RGPD-2026-00012",
    "response_date": "03/01/2026",
    "account_created_at": "15/03/2024",
    "last_login": "03/01/2026 à 14h32",
    "devices_count": "3",
    "active_sessions": "2",
    "calls_received": "127",
    "door_openings": "89",
    "messages_count": "34",
    "scheduled_access_count": "5",
    "current_plan": "ANR Premium",
    "subscription_start": "15/03/2024",
    "monthly_amount": "9,90",
    "invoices_count": "22",
    "dpo_email": "dpo@anr.fr",
    "company_name": "ANR Technologies SAS",
    "company_address": "123 Avenue de la République, 75011 Paris"
  }'::jsonb,
  version = COALESCE(version, 0) + 1,
  updated_at = NOW()
WHERE template_key = 'rgpd_export';