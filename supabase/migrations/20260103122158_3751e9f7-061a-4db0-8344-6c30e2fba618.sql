-- 4. RESIDENT INVITATION TEMPLATE - Professional with clear instructions (~8000 chars)
UPDATE public.email_templates 
SET 
  html_content = '<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation à rejoindre votre habitation ANR</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:''Segoe UI'',Roboto,''Helvetica Neue'',Arial,sans-serif;line-height:1.6;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);padding:40px;text-align:center;">
              <div style="font-size:48px;margin-bottom:10px;">🏠</div>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Vous êtes invité(e) !</h1>
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.9);font-size:15px;">{{inviter_name}} souhaite vous ajouter à son habitation</p>
            </td>
          </tr>
          
          <!-- Personal greeting -->
          <tr>
            <td style="padding:40px 40px 20px;">
              <p style="margin:0;font-size:16px;color:#1e293b;">Bonjour <strong>{{recipient_name}}</strong>,</p>
              <p style="margin:16px 0 0;font-size:15px;color:#475569;line-height:1.7;">
                <strong>{{inviter_name}}</strong> vous invite à rejoindre son habitation sur ANR, l''interphone connecté nouvelle génération. En acceptant cette invitation, vous pourrez :
              </p>
            </td>
          </tr>
          
          <!-- Benefits -->
          <tr>
            <td style="padding:0 40px 30px;">
              <div style="background-color:#fffbeb;border:1px solid #fcd34d;border-radius:12px;padding:20px;">
                <ul style="margin:0;padding-left:20px;font-size:14px;color:#78350f;line-height:2;">
                  <li>📱 Recevoir les appels visiteurs sur votre smartphone</li>
                  <li>🚪 Ouvrir la porte à distance d''un simple tap</li>
                  <li>💬 Échanger des messages avec les visiteurs</li>
                  <li>🔐 Programmer des accès pour vos proches et livreurs</li>
                  <li>📞 Participer aux appels en conférence</li>
                </ul>
              </div>
            </td>
          </tr>
          
          <!-- Habitation Info -->
          <tr>
            <td style="padding:0 40px 30px;">
              <div style="background-color:#f1f5f9;border-radius:12px;padding:20px;">
                <h2 style="margin:0 0 15px;font-size:14px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Détails de l''habitation</h2>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#64748b;">Nom</td>
                    <td style="padding:8px 0;font-size:14px;color:#1e293b;font-weight:600;text-align:right;">{{habitation_name}}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#64748b;border-top:1px solid #e2e8f0;">Adresse</td>
                    <td style="padding:8px 0;font-size:14px;color:#1e293b;font-weight:600;text-align:right;">{{habitation_address}}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#64748b;border-top:1px solid #e2e8f0;">Étage</td>
                    <td style="padding:8px 0;font-size:14px;color:#1e293b;font-weight:600;text-align:right;">{{floor}}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding:0 40px 30px;text-align:center;">
              <a href="{{invitation_url}}" style="display:inline-block;background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:#ffffff;text-decoration:none;padding:18px 50px;border-radius:10px;font-size:17px;font-weight:600;box-shadow:0 4px 14px -3px rgba(16,185,129,0.5);">Accepter l''invitation</a>
              <p style="margin:15px 0 0;font-size:13px;color:#64748b;">Ou copiez ce lien dans votre navigateur :</p>
              <p style="margin:8px 0 0;font-size:12px;color:#3b82f6;word-break:break-all;">{{invitation_url}}</p>
            </td>
          </tr>
          
          <!-- Expiration Warning -->
          <tr>
            <td style="padding:0 40px 30px;">
              <div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:15px 20px;text-align:center;">
                <p style="margin:0;font-size:14px;color:#991b1b;">
                  ⏰ <strong>Attention :</strong> Cette invitation expire le <strong>{{expiration_date}}</strong>
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Security Notice -->
          <tr>
            <td style="padding:0 40px 30px;">
              <div style="border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
                <h2 style="margin:0 0 10px;font-size:14px;color:#1e293b;font-weight:600;">🔒 Note de sécurité</h2>
                <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">
                  Si vous n''avez pas demandé cette invitation ou ne connaissez pas {{inviter_name}}, veuillez ignorer cet email. Votre sécurité est notre priorité.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Help -->
          <tr>
            <td style="padding:0 40px 40px;">
              <p style="margin:0;font-size:14px;color:#475569;line-height:1.7;">
                Besoin d''aide ? Contactez notre support :<br>
                📧 <a href="mailto:{{support_email}}" style="color:#3b82f6;text-decoration:none;">{{support_email}}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color:#1e293b;padding:30px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:14px;color:#ffffff;font-weight:500;">{{company_name}}</p>
              <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;">L''interphone connecté nouvelle génération</p>
              <p style="margin:0;font-size:11px;color:#64748b;">
                <a href="{{website_url}}" style="color:#94a3b8;text-decoration:underline;">www.anr.fr</a> · 
                <a href="{{privacy_url}}" style="color:#94a3b8;text-decoration:underline;">Politique de confidentialité</a>
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
  variables = '["recipient_name","inviter_name","habitation_name","habitation_address","floor","invitation_url","expiration_date","support_email","company_name","website_url","privacy_url"]'::jsonb,
  preview_data = '{
    "recipient_name": "Marie Martin",
    "inviter_name": "Jean Dupont",
    "habitation_name": "Appartement Dupont",
    "habitation_address": "123 Avenue de la République, 75011 Paris",
    "floor": "3ème étage",
    "invitation_url": "https://app.anr.fr/invitation/abc123",
    "expiration_date": "10/01/2026 à 23h59",
    "support_email": "support@anr.fr",
    "company_name": "ANR Technologies SAS",
    "website_url": "https://www.anr.fr",
    "privacy_url": "https://www.anr.fr/privacy"
  }'::jsonb,
  version = COALESCE(version, 0) + 1,
  updated_at = NOW()
WHERE template_key = 'resident_invitation';


-- 5. SCHEDULED ACCESS NOTIFICATION TEMPLATE (~7000 chars)
UPDATE public.email_templates 
SET 
  html_content = '<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouvel accès programmé à votre habitation</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:''Segoe UI'',Roboto,''Helvetica Neue'',Arial,sans-serif;line-height:1.6;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#06b6d4 0%,#0891b2 100%);padding:40px;text-align:center;">
              <div style="font-size:48px;margin-bottom:10px;">🔑</div>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Accès programmé</h1>
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.9);font-size:15px;">{{action_label}}</p>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding:40px 40px 20px;">
              <p style="margin:0;font-size:16px;color:#1e293b;">Bonjour,</p>
              <p style="margin:16px 0 0;font-size:15px;color:#475569;line-height:1.7;">
                {{action_description}}
              </p>
            </td>
          </tr>
          
          <!-- Access Details -->
          <tr>
            <td style="padding:0 40px 30px;">
              <div style="background:linear-gradient(135deg,#ecfeff 0%,#cffafe 100%);border:1px solid #67e8f9;border-radius:12px;padding:25px;">
                <h2 style="margin:0 0 20px;font-size:16px;color:#0e7490;font-weight:600;">📋 Détails de l''accès</h2>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#0e7490;">Nom de l''accès</td>
                    <td style="padding:8px 0;font-size:14px;color:#0e7490;font-weight:600;text-align:right;">{{access_name}}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#0e7490;border-top:1px solid #a5f3fc;">Bénéficiaire</td>
                    <td style="padding:8px 0;font-size:14px;color:#0e7490;font-weight:600;text-align:right;">{{beneficiary_name}}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#0e7490;border-top:1px solid #a5f3fc;">Créé par</td>
                    <td style="padding:8px 0;font-size:14px;color:#0e7490;font-weight:600;text-align:right;">{{grantor_name}}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- Schedule Info -->
          <tr>
            <td style="padding:0 40px 30px;">
              <div style="border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
                <h2 style="margin:0 0 15px;font-size:14px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">⏰ Horaires autorisés</h2>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#64748b;">Jours</td>
                    <td style="padding:8px 0;font-size:14px;color:#1e293b;font-weight:600;text-align:right;">{{days_of_week}}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#64748b;border-top:1px solid #f1f5f9;">Horaires</td>
                    <td style="padding:8px 0;font-size:14px;color:#1e293b;font-weight:600;text-align:right;">{{time_from}} - {{time_to}}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#64748b;border-top:1px solid #f1f5f9;">Période de validité</td>
                    <td style="padding:8px 0;font-size:14px;color:#1e293b;font-weight:600;text-align:right;">{{valid_from}} au {{valid_until}}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- Location -->
          <tr>
            <td style="padding:0 40px 30px;">
              <div style="background-color:#f1f5f9;border-radius:12px;padding:20px;">
                <h2 style="margin:0 0 10px;font-size:14px;color:#64748b;font-weight:600;">📍 Adresse concernée</h2>
                <p style="margin:0;font-size:14px;color:#1e293b;font-weight:500;">{{address}}</p>
              </div>
            </td>
          </tr>
          
          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 30px;text-align:center;">
              <a href="{{dashboard_url}}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:8px;font-size:16px;font-weight:600;box-shadow:0 4px 6px -1px rgba(59,130,246,0.4);">Gérer mes accès</a>
            </td>
          </tr>
          
          <!-- Security Notice -->
          <tr>
            <td style="padding:0 40px 40px;">
              <div style="background-color:#fef3c7;border:1px solid #fcd34d;border-radius:12px;padding:15px 20px;">
                <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
                  ⚠️ <strong>Important :</strong> Si vous n''êtes pas à l''origine de cette action ou si vous avez des doutes, veuillez vérifier immédiatement dans votre espace ANR et contacter le support si nécessaire.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color:#1e293b;padding:30px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:14px;color:#ffffff;font-weight:500;">{{company_name}}</p>
              <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;">{{company_address}}</p>
              <p style="margin:0;font-size:11px;color:#64748b;">
                Email de notification automatique - Ne pas répondre
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
  variables = '["action_label","action_description","access_name","beneficiary_name","grantor_name","days_of_week","time_from","time_to","valid_from","valid_until","address","dashboard_url","company_name","company_address"]'::jsonb,
  preview_data = '{
    "action_label": "Nouvel accès créé",
    "action_description": "Un nouvel accès programmé a été créé pour votre habitation. Voici les détails :",
    "access_name": "Femme de ménage - Mme Garcia",
    "beneficiary_name": "Maria Garcia",
    "grantor_name": "Jean Dupont",
    "days_of_week": "Lundi, Mercredi, Vendredi",
    "time_from": "09:00",
    "time_to": "12:00",
    "valid_from": "01/01/2026",
    "valid_until": "31/12/2026",
    "address": "123 Avenue de la République, 75011 Paris",
    "dashboard_url": "https://app.anr.fr/door-access",
    "company_name": "ANR Technologies SAS",
    "company_address": "123 Avenue de la République, 75011 Paris"
  }'::jsonb,
  version = COALESCE(version, 0) + 1,
  updated_at = NOW()
WHERE template_key = 'scheduled_access_notification';


-- 6. SUPPORT NOTIFICATION TEMPLATE (~6000 chars)
UPDATE public.email_templates 
SET 
  html_content = '<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouvelle demande de support</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:''Segoe UI'',Roboto,''Helvetica Neue'',Arial,sans-serif;line-height:1.6;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);padding:30px 40px;text-align:center;">
              <div style="font-size:40px;margin-bottom:8px;">🎫</div>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Nouvelle demande de support</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Ticket #{{ticket_id}}</p>
            </td>
          </tr>
          
          <!-- Priority Badge -->
          <tr>
            <td style="padding:30px 40px 20px;text-align:center;">
              <span style="display:inline-block;background-color:{{priority_color}};color:#ffffff;padding:6px 16px;border-radius:20px;font-size:12px;font-weight:600;text-transform:uppercase;">{{priority_label}}</span>
            </td>
          </tr>
          
          <!-- User Info -->
          <tr>
            <td style="padding:0 40px 30px;">
              <div style="background-color:#f1f5f9;border-radius:12px;padding:20px;">
                <h2 style="margin:0 0 15px;font-size:14px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">👤 Informations utilisateur</h2>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#64748b;">Nom</td>
                    <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;text-align:right;">{{user_name}}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#64748b;border-top:1px solid #e2e8f0;">Email</td>
                    <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;text-align:right;">{{user_email}}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#64748b;border-top:1px solid #e2e8f0;">Téléphone</td>
                    <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;text-align:right;">{{user_phone}}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#64748b;border-top:1px solid #e2e8f0;">Code ANR</td>
                    <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;text-align:right;font-family:monospace;">{{anr_code}}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:14px;color:#64748b;border-top:1px solid #e2e8f0;">Plan</td>
                    <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;text-align:right;">{{user_plan}}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- Request Details -->
          <tr>
            <td style="padding:0 40px 30px;">
              <div style="border:2px solid #ef4444;border-radius:12px;overflow:hidden;">
                <div style="background-color:#fef2f2;padding:15px 20px;border-bottom:1px solid #fecaca;">
                  <h2 style="margin:0;font-size:14px;color:#991b1b;font-weight:600;">💬 Catégorie : {{category}}</h2>
                </div>
                <div style="padding:20px;">
                  <p style="margin:0 0 10px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Sujet</p>
                  <p style="margin:0 0 20px;font-size:16px;color:#1e293b;font-weight:600;">{{subject}}</p>
                  <p style="margin:0 0 10px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Message</p>
                  <div style="background-color:#f8fafc;border-radius:8px;padding:15px;font-size:14px;color:#475569;line-height:1.7;white-space:pre-wrap;">{{message}}</div>
                </div>
              </div>
            </td>
          </tr>
          
          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 30px;text-align:center;">
              <a href="{{admin_url}}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:8px;font-size:16px;font-weight:600;box-shadow:0 4px 6px -1px rgba(59,130,246,0.4);">Ouvrir dans l''admin</a>
            </td>
          </tr>
          
          <!-- Timestamp -->
          <tr>
            <td style="padding:0 40px 30px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#64748b;">
                Reçu le {{created_at}}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color:#1e293b;padding:25px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                Email de notification interne - Support ANR
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
  variables = '["ticket_id","priority_label","priority_color","user_name","user_email","user_phone","anr_code","user_plan","category","subject","message","admin_url","created_at"]'::jsonb,
  preview_data = '{
    "ticket_id": "SUP-2026-00234",
    "priority_label": "Priorité haute",
    "priority_color": "#ef4444",
    "user_name": "Jean Dupont",
    "user_email": "jean.dupont@email.fr",
    "user_phone": "+33 6 12 34 56 78",
    "anr_code": "ANR-75011-PARIS-001",
    "user_plan": "Premium",
    "category": "Problème technique",
    "subject": "Impossible d''ouvrir la porte depuis l''application",
    "message": "Bonjour,\n\nDepuis ce matin, le bouton d''ouverture de porte ne fonctionne plus. L''application indique \"Erreur de connexion au module\".\n\nJ''ai déjà essayé de redémarrer l''application et mon téléphone.\n\nMerci de votre aide.",
    "admin_url": "https://app.anr.fr/admin/support/SUP-2026-00234",
    "created_at": "03/01/2026 à 15h42"
  }'::jsonb,
  version = COALESCE(version, 0) + 1,
  updated_at = NOW()
WHERE template_key = 'support_notification';