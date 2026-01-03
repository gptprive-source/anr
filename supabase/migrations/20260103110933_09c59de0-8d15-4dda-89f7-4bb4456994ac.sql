-- Table pour stocker les templates email configurables
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('invoice', 'confirmation', 'notification', 'legal')),
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  variables JSONB DEFAULT '[]'::jsonb,
  preview_data JSONB DEFAULT '{}'::jsonb,
  default_html_content TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Table pour logger tous les documents envoyés
CREATE TABLE public.sent_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID,
  subject TEXT NOT NULL,
  html_snapshot TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour les recherches
CREATE INDEX idx_email_templates_category ON public.email_templates(category);
CREATE INDEX idx_email_templates_key ON public.email_templates(template_key);
CREATE INDEX idx_sent_documents_template ON public.sent_documents(template_key);
CREATE INDEX idx_sent_documents_recipient ON public.sent_documents(recipient_email);
CREATE INDEX idx_sent_documents_sent_at ON public.sent_documents(sent_at DESC);

-- RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sent_documents ENABLE ROW LEVEL SECURITY;

-- Policies pour admin uniquement (utilise user_roles)
CREATE POLICY "Admins can manage email templates"
ON public.email_templates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can view sent documents"
ON public.sent_documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Trigger pour updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insérer les templates par défaut
INSERT INTO public.email_templates (template_key, name, description, category, subject, html_content, default_html_content, variables, preview_data) VALUES

-- Facture
('invoice', 'Facture', 'Template de facture envoyée aux clients', 'invoice', 
'Facture {{invoiceNumber}} - ANR',
'<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { padding: 30px; background: #f9fafb; }
    .invoice-details { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .items-table th, .items-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    .items-table th { background: #f3f4f6; }
    .total-row { font-weight: bold; font-size: 18px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; padding: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Facture {{invoiceNumber}}</h1>
    </div>
    <div class="content">
      <div class="invoice-details">
        <p><strong>Client:</strong> {{firstName}} {{lastName}}</p>
        <p><strong>Email:</strong> {{email}}</p>
        <p><strong>Date:</strong> {{date}}</p>
      </div>
      <table class="items-table">
        <thead>
          <tr><th>Description</th><th>Qté</th><th>Prix</th><th>Total</th></tr>
        </thead>
        <tbody>{{items}}</tbody>
        <tfoot>
          <tr class="total-row"><td colspan="3">Total TTC</td><td>{{total}}</td></tr>
        </tfoot>
      </table>
    </div>
    <div class="footer">
      <p>{{companyName}} - {{companyAddress}}</p>
      <p>SIRET: {{companySiret}}</p>
    </div>
  </div>
</body>
</html>',
'<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { padding: 30px; background: #f9fafb; }
    .invoice-details { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .items-table th, .items-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    .items-table th { background: #f3f4f6; }
    .total-row { font-weight: bold; font-size: 18px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; padding: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Facture {{invoiceNumber}}</h1>
    </div>
    <div class="content">
      <div class="invoice-details">
        <p><strong>Client:</strong> {{firstName}} {{lastName}}</p>
        <p><strong>Email:</strong> {{email}}</p>
        <p><strong>Date:</strong> {{date}}</p>
      </div>
      <table class="items-table">
        <thead>
          <tr><th>Description</th><th>Qté</th><th>Prix</th><th>Total</th></tr>
        </thead>
        <tbody>{{items}}</tbody>
        <tfoot>
          <tr class="total-row"><td colspan="3">Total TTC</td><td>{{total}}</td></tr>
        </tfoot>
      </table>
    </div>
    <div class="footer">
      <p>{{companyName}} - {{companyAddress}}</p>
      <p>SIRET: {{companySiret}}</p>
    </div>
  </div>
</body>
</html>',
'["invoiceNumber", "firstName", "lastName", "email", "date", "items", "total", "companyName", "companyAddress", "companySiret"]'::jsonb,
'{"invoiceNumber": "FAC-2024-001", "firstName": "Jean", "lastName": "Dupont", "email": "jean@example.com", "date": "03/01/2026", "items": "<tr><td>Abonnement ANR Premium</td><td>1</td><td>9,90 €</td><td>9,90 €</td></tr>", "total": "9,90 €", "companyName": "ANR SAS", "companyAddress": "123 Rue Example, 75001 Paris", "companySiret": "123 456 789 00012"}'::jsonb),

-- Confirmation abonnement
('subscription_confirmation', 'Confirmation abonnement', 'Email après nouvel abonnement', 'confirmation',
'Bienvenue chez ANR - Abonnement confirmé',
'<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .button { display: inline-block; background: #0ea5e9; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Bienvenue chez ANR !</h1></div>
    <div class="content">
      <p>Bonjour {{firstName}} {{lastName}},</p>
      <p>Votre abonnement a été activé avec succès !</p>
      <div class="info-box">
        <p><strong>Habitation:</strong> {{habitationName}}</p>
        <p><strong>Code ANR:</strong> {{anrCode}}</p>
        <p><strong>Montant:</strong> {{amount}}</p>
        <p><strong>Prochaine facturation:</strong> {{nextBillingDate}}</p>
      </div>
      <p style="text-align: center;"><a href="{{dashboardUrl}}" class="button">Accéder à mon espace</a></p>
    </div>
    <div class="footer"><p>ANR - Votre sonnette intelligente</p></div>
  </div>
</body>
</html>',
'<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .button { display: inline-block; background: #0ea5e9; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Bienvenue chez ANR !</h1></div>
    <div class="content">
      <p>Bonjour {{firstName}} {{lastName}},</p>
      <p>Votre abonnement a été activé avec succès !</p>
      <div class="info-box">
        <p><strong>Habitation:</strong> {{habitationName}}</p>
        <p><strong>Code ANR:</strong> {{anrCode}}</p>
        <p><strong>Montant:</strong> {{amount}}</p>
        <p><strong>Prochaine facturation:</strong> {{nextBillingDate}}</p>
      </div>
      <p style="text-align: center;"><a href="{{dashboardUrl}}" class="button">Accéder à mon espace</a></p>
    </div>
    <div class="footer"><p>ANR - Votre sonnette intelligente</p></div>
  </div>
</body>
</html>',
'["firstName", "lastName", "habitationName", "anrCode", "amount", "nextBillingDate", "dashboardUrl"]'::jsonb,
'{"firstName": "Jean", "lastName": "Dupont", "habitationName": "Maison principale", "anrCode": "ANR-ABC123", "amount": "9,90 €/mois", "nextBillingDate": "03/02/2026", "dashboardUrl": "https://anr.app/dashboard"}'::jsonb),

-- Invitation résident
('resident_invitation', 'Invitation résident', 'Email pour inviter un résident', 'notification',
'{{inviterName}} vous invite à rejoindre {{habitationName}}',
'<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6; }
    .button { display: inline-block; background: #8b5cf6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Invitation à rejoindre une habitation</h1></div>
    <div class="content">
      <p>Bonjour {{firstName}},</p>
      <p><strong>{{inviterName}}</strong> vous invite à rejoindre <strong>{{habitationName}}</strong> sur ANR.</p>
      <div class="info-box">
        <p><strong>Adresse:</strong> {{address}}</p>
        <p><strong>Code ANR:</strong> {{anrCode}}</p>
      </div>
      <p style="text-align: center; margin: 30px 0;"><a href="{{invitationUrl}}" class="button">Accepter invitation</a></p>
      <p style="color: #f59e0b;">Cette invitation expire dans {{expiresIn}}.</p>
    </div>
    <div class="footer"><p>ANR - Votre sonnette intelligente</p></div>
  </div>
</body>
</html>',
'<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6; }
    .button { display: inline-block; background: #8b5cf6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Invitation à rejoindre une habitation</h1></div>
    <div class="content">
      <p>Bonjour {{firstName}},</p>
      <p><strong>{{inviterName}}</strong> vous invite à rejoindre <strong>{{habitationName}}</strong> sur ANR.</p>
      <div class="info-box">
        <p><strong>Adresse:</strong> {{address}}</p>
        <p><strong>Code ANR:</strong> {{anrCode}}</p>
      </div>
      <p style="text-align: center; margin: 30px 0;"><a href="{{invitationUrl}}" class="button">Accepter invitation</a></p>
      <p style="color: #f59e0b;">Cette invitation expire dans {{expiresIn}}.</p>
    </div>
    <div class="footer"><p>ANR - Votre sonnette intelligente</p></div>
  </div>
</body>
</html>',
'["firstName", "inviterName", "habitationName", "address", "anrCode", "invitationUrl", "expiresIn"]'::jsonb,
'{"firstName": "Marie", "inviterName": "Jean Dupont", "habitationName": "Maison principale", "address": "123 Rue Example, 75001 Paris", "anrCode": "ANR-ABC123", "invitationUrl": "https://anr.app/invitation/abc123", "expiresIn": "7 jours"}'::jsonb),

-- Notification support
('support_notification', 'Notification demande support', 'Email à équipe support', 'notification',
'Demande support: {{userName}} - {{userEmail}}',
'<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .info { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .conversation { background: white; padding: 20px; border-radius: 8px; white-space: pre-wrap; font-size: 14px; }
    .button { display: inline-block; background: #0ea5e9; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Demande de support humain</h1></div>
    <div class="content">
      <div class="info">
        <p><strong>Utilisateur:</strong> {{userName}}</p>
        <p><strong>Email:</strong> {{userEmail}}</p>
        <p><strong>ID Conversation:</strong> {{conversationId}}</p>
        <p><strong>Date:</strong> {{date}}</p>
      </div>
      <h3>Historique:</h3>
      <div class="conversation">{{messages}}</div>
      <p style="text-align: center;"><a href="{{adminUrl}}" class="button">Répondre dans admin</a></p>
    </div>
    <div class="footer"><p>ANR - Support Client</p></div>
  </div>
</body>
</html>',
'<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .info { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .conversation { background: white; padding: 20px; border-radius: 8px; white-space: pre-wrap; font-size: 14px; }
    .button { display: inline-block; background: #0ea5e9; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Demande de support humain</h1></div>
    <div class="content">
      <div class="info">
        <p><strong>Utilisateur:</strong> {{userName}}</p>
        <p><strong>Email:</strong> {{userEmail}}</p>
        <p><strong>ID Conversation:</strong> {{conversationId}}</p>
        <p><strong>Date:</strong> {{date}}</p>
      </div>
      <h3>Historique:</h3>
      <div class="conversation">{{messages}}</div>
      <p style="text-align: center;"><a href="{{adminUrl}}" class="button">Répondre dans admin</a></p>
    </div>
    <div class="footer"><p>ANR - Support Client</p></div>
  </div>
</body>
</html>',
'["userName", "userEmail", "conversationId", "date", "messages", "adminUrl"]'::jsonb,
'{"userName": "Jean Dupont", "userEmail": "jean@example.com", "conversationId": "conv-123", "date": "03/01/2026 14:30", "messages": "Utilisateur: Bonjour\n\nBot: Comment puis-je vous aider ?", "adminUrl": "https://anr.app/admin/support"}'::jsonb),

-- Export RGPD
('rgpd_export', 'Export données RGPD', 'Document export données personnelles', 'legal',
'Vos données personnelles - ANR',
'<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .section { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; }
    .section h3 { margin-top: 0; color: #4f46e5; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Vos données personnelles</h1>
      <p>Export RGPD - {{exportDate}}</p>
    </div>
    <div class="content">
      <p>Bonjour {{firstName}} {{lastName}},</p>
      <p>Voici ensemble des données personnelles que nous détenons vous concernant.</p>
      <div class="section"><h3>Profil</h3>{{profileData}}</div>
      <div class="section"><h3>Habitations</h3>{{habitations}}</div>
      <div class="section"><h3>Historique des appels</h3>{{callHistory}}</div>
      <div class="section"><h3>Appareils connectés</h3>{{devices}}</div>
      <p>Pour toute question, contactez-nous à {{supportEmail}}.</p>
    </div>
    <div class="footer"><p>ANR - Protection de vos données</p></div>
  </div>
</body>
</html>',
'<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .section { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; }
    .section h3 { margin-top: 0; color: #4f46e5; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Vos données personnelles</h1>
      <p>Export RGPD - {{exportDate}}</p>
    </div>
    <div class="content">
      <p>Bonjour {{firstName}} {{lastName}},</p>
      <p>Voici ensemble des données personnelles que nous détenons vous concernant.</p>
      <div class="section"><h3>Profil</h3>{{profileData}}</div>
      <div class="section"><h3>Habitations</h3>{{habitations}}</div>
      <div class="section"><h3>Historique des appels</h3>{{callHistory}}</div>
      <div class="section"><h3>Appareils connectés</h3>{{devices}}</div>
      <p>Pour toute question, contactez-nous à {{supportEmail}}.</p>
    </div>
    <div class="footer"><p>ANR - Protection de vos données</p></div>
  </div>
</body>
</html>',
'["firstName", "lastName", "exportDate", "profileData", "habitations", "callHistory", "devices", "supportEmail"]'::jsonb,
'{"firstName": "Jean", "lastName": "Dupont", "exportDate": "03/01/2026", "profileData": "<p>Email: jean@example.com</p>", "habitations": "<p>Maison principale</p>", "callHistory": "<p>15 appels ce mois</p>", "devices": "<p>iPhone 15 Pro</p>", "supportEmail": "support@anr.app"}'::jsonb),

-- Notification accès programmé
('scheduled_access_notification', 'Notification accès programmé', 'Email création/modification accès', 'notification',
'{{action}} - Accès programmé chez {{address}}',
'<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .access-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>{{action}}</h1></div>
    <div class="content">
      <p>Bonjour,</p>
      <p>{{grantorName}} vous a accordé un accès programmé.</p>
      <div class="access-card">
        <h3>{{address}}</h3>
        <p><strong>Nom:</strong> {{accessName}}</p>
        <p><strong>Description:</strong> {{description}}</p>
        <p><strong>Horaires:</strong> {{timeFrom}} - {{timeTo}}</p>
        <p><strong>Jours:</strong> {{days}}</p>
        <p><strong>Période:</strong> Du {{validFrom}} au {{validUntil}}</p>
      </div>
      {{instructions}}
    </div>
    <div class="footer"><p>ANR - Gestion des accès</p></div>
  </div>
</body>
</html>',
'<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .access-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>{{action}}</h1></div>
    <div class="content">
      <p>Bonjour,</p>
      <p>{{grantorName}} vous a accordé un accès programmé.</p>
      <div class="access-card">
        <h3>{{address}}</h3>
        <p><strong>Nom:</strong> {{accessName}}</p>
        <p><strong>Description:</strong> {{description}}</p>
        <p><strong>Horaires:</strong> {{timeFrom}} - {{timeTo}}</p>
        <p><strong>Jours:</strong> {{days}}</p>
        <p><strong>Période:</strong> Du {{validFrom}} au {{validUntil}}</p>
      </div>
      {{instructions}}
    </div>
    <div class="footer"><p>ANR - Gestion des accès</p></div>
  </div>
</body>
</html>',
'["action", "grantorName", "address", "accessName", "description", "timeFrom", "timeTo", "days", "validFrom", "validUntil", "instructions"]'::jsonb,
'{"action": "Nouvel accès programmé", "grantorName": "Jean Dupont", "address": "123 Rue Example, 75001 Paris", "accessName": "Femme de ménage", "description": "Accès hebdomadaire", "timeFrom": "09:00", "timeTo": "12:00", "days": "Lundi, Mercredi, Vendredi", "validFrom": "01/01/2026", "validUntil": "31/12/2026", "instructions": ""}'::jsonb);