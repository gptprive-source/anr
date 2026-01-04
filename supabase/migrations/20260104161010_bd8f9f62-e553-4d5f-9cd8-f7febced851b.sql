-- Créer le template email pour notifier l'admin d'une nouvelle demande de relais
INSERT INTO email_templates (
  template_key,
  name,
  category,
  subject,
  html_content,
  is_active,
  variables,
  description
) VALUES (
  'relay_application_received',
  'Nouvelle demande de point relais',
  'notification',
  'Nouvelle demande de point relais : {{relay_name}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
    .btn { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📦 Nouvelle demande de Point Relais</h1>
  </div>
  <div class="content">
    <p>Bonjour,</p>
    <p>Une nouvelle demande d''inscription en tant que Point Relais vient d''être soumise et nécessite votre validation.</p>
    
    <div class="info-box">
      <h3 style="margin-top: 0;">Informations du demandeur</h3>
      <p><strong>Nom :</strong> {{relay_name}}</p>
      <p><strong>Téléphone :</strong> {{phone}}</p>
      <p><strong>Adresse ANR :</strong> {{address}}</p>
      <p><strong>Capacité max :</strong> {{max_capacity}} colis</p>
      <p><strong>Date de demande :</strong> {{created_at}}</p>
    </div>
    
    <p>Veuillez vous connecter à l''interface d''administration pour examiner et valider cette demande.</p>
    
    <a href="{{dashboard_url}}" class="btn">Voir les demandes en attente</a>
  </div>
  <div class="footer">
    <p>{{company_name}} - Email automatique</p>
  </div>
</body>
</html>',
  true,
  '["relay_name", "phone", "address", "max_capacity", "created_at", "dashboard_url", "company_name"]',
  'Email envoyé à l''admin lorsqu''un utilisateur soumet une demande pour devenir point relais'
) ON CONFLICT (template_key) DO UPDATE SET
  html_content = EXCLUDED.html_content,
  subject = EXCLUDED.subject,
  is_active = true;