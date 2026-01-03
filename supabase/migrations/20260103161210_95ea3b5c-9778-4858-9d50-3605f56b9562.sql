-- Variables app_config pour relais et transporteurs
INSERT INTO app_config (key, value, category, description) VALUES 
  ('relay_minimum_payout', '10', 'relay', 'Seuil minimum en € pour déclencher un virement relais'),
  ('carrier_rate_per_relay_deposit', '0.30', 'facturation', 'Tarif par dépôt en point relais (€ HT)'),
  ('carrier_rate_per_direct_delivery', '0.25', 'facturation', 'Tarif par livraison directe (€ HT)'),
  ('parcel_pickup_reminder_days', '3', 'limits', 'Jours avant rappel récupération colis')
ON CONFLICT (key) DO NOTHING;

-- Templates Relais Colis (8) - catégorie: notification
INSERT INTO email_templates (template_key, name, category, description, subject, html_content, variables, is_active) VALUES
('relay_registration_confirmation', 'Confirmation inscription relais', 'notification', 'Email envoyé lors inscription comme point relais',
'Bienvenue dans le réseau ANR Relais Colis !',
'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<div style="text-align: center; margin-bottom: 30px;">
  <h1 style="color: #1e3a5f;">🏪 Bienvenue dans le réseau ANR !</h1>
</div>
<p>Bonjour {{relay_name}},</p>
<p>Votre demande d''inscription comme point relais a bien été enregistrée.</p>
<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3 style="margin-top: 0;">📍 Votre point relais</h3>
  <p><strong>Nom :</strong> {{display_name}}</p>
  <p><strong>Adresse :</strong> {{address}}</p>
  <p><strong>Code ANR :</strong> {{anr_code}}</p>
</div>
<p>Notre équipe va examiner votre demande dans les plus brefs délais. Vous recevrez un email dès que votre compte sera vérifié.</p>
<div style="text-align: center; margin: 30px 0;">
  <a href="{{dashboard_url}}" style="background: #1e3a5f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Accéder à mon espace</a>
</div>
<p>À très bientôt,<br>L''équipe {{company_name}}</p>
</body></html>',
'["relay_name", "display_name", "address", "anr_code", "dashboard_url", "company_name"]', true),

('relay_verification_approved', 'Point relais vérifié', 'notification', 'Email envoyé quand admin approuve le point relais',
'Félicitations ! Votre point relais est activé 🎉',
'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<div style="text-align: center; margin-bottom: 30px;">
  <h1 style="color: #22c55e;">✅ Point relais activé !</h1>
</div>
<p>Bonjour {{relay_name}},</p>
<p>Excellente nouvelle ! Votre point relais <strong>{{display_name}}</strong> a été vérifié et est maintenant <strong>actif</strong>.</p>
<div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
  <h3 style="margin-top: 0; color: #166534;">🚀 Vous pouvez maintenant :</h3>
  <ul>
    <li>Recevoir des colis des transporteurs partenaires</li>
    <li>Remettre les colis aux destinataires</li>
    <li>Générer des revenus à chaque colis traité</li>
  </ul>
</div>
<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3 style="margin-top: 0;">💰 Rémunération</h3>
  <p><strong>{{rate_per_parcel}}€</strong> par colis traité</p>
  <p>Virements automatiques dès {{minimum_payout}}€ atteints</p>
</div>
<div style="text-align: center; margin: 30px 0;">
  <a href="{{dashboard_url}}" style="background: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Gérer mon point relais</a>
</div>
<p>Bienvenue dans le réseau !<br>L''équipe {{company_name}}</p>
</body></html>',
'["relay_name", "display_name", "rate_per_parcel", "minimum_payout", "dashboard_url", "company_name"]', true),

('relay_verification_rejected', 'Point relais non approuvé', 'notification', 'Email envoyé quand admin refuse le point relais',
'Votre demande de point relais nécessite des ajustements',
'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<div style="text-align: center; margin-bottom: 30px;">
  <h1 style="color: #ef4444;">❌ Demande non approuvée</h1>
</div>
<p>Bonjour {{relay_name}},</p>
<p>Nous avons examiné votre demande pour le point relais <strong>{{display_name}}</strong>, mais nous ne pouvons malheureusement pas l''approuver pour le moment.</p>
<div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
  <h3 style="margin-top: 0; color: #991b1b;">Motif :</h3>
  <p>{{rejection_reason}}</p>
</div>
<p>Vous pouvez corriger ces éléments et soumettre une nouvelle demande, ou nous contacter pour plus d''informations.</p>
<div style="text-align: center; margin: 30px 0;">
  <a href="{{contact_url}}" style="background: #1e3a5f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Nous contacter</a>
</div>
<p>Cordialement,<br>L''équipe {{company_name}}</p>
</body></html>',
'["relay_name", "display_name", "rejection_reason", "contact_url", "company_name"]', true),

('relay_payout_pending', 'Virement relais en cours', 'notification', 'Email envoyé quand paiement atteint le seuil',
'💰 Votre virement de {{payout_amount}}€ est en cours',
'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<div style="text-align: center; margin-bottom: 30px;">
  <h1 style="color: #1e3a5f;">💸 Virement en préparation</h1>
</div>
<p>Bonjour {{relay_name}},</p>
<p>Félicitations ! Vous avez atteint le seuil de paiement. Un virement est en cours de traitement.</p>
<div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
  <h2 style="margin: 0; color: #1e3a5f; font-size: 36px;">{{payout_amount}}€</h2>
  <p style="margin: 10px 0 0; color: #666;">Montant du virement</p>
</div>
<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3 style="margin-top: 0;">📊 Détails</h3>
  <p><strong>Période :</strong> {{period_start}} au {{period_end}}</p>
  <p><strong>Colis traités :</strong> {{parcels_count}}</p>
  <p><strong>IBAN :</strong> {{iban_masked}}</p>
</div>
<p>Le virement sera effectué sous 3-5 jours ouvrés.</p>
<div style="text-align: center; margin: 30px 0;">
  <a href="{{dashboard_url}}" style="background: #1e3a5f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Voir mes paiements</a>
</div>
<p>Merci pour votre confiance,<br>L''équipe {{company_name}}</p>
</body></html>',
'["relay_name", "payout_amount", "period_start", "period_end", "parcels_count", "iban_masked", "dashboard_url", "company_name"]', true),

('relay_payout_completed', 'Virement relais effectué', 'notification', 'Email envoyé quand virement est envoyé',
'✅ Virement de {{payout_amount}}€ effectué',
'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<div style="text-align: center; margin-bottom: 30px;">
  <h1 style="color: #22c55e;">✅ Virement effectué !</h1>
</div>
<p>Bonjour {{relay_name}},</p>
<p>Votre virement a été envoyé avec succès.</p>
<div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
  <h2 style="margin: 0; color: #166534; font-size: 36px;">{{payout_amount}}€</h2>
  <p style="margin: 10px 0 0; color: #666;">Crédité sur votre compte</p>
</div>
<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <p><strong>Référence :</strong> {{transfer_reference}}</p>
  <p><strong>IBAN :</strong> {{iban_masked}}</p>
  <p><strong>Date :</strong> {{payment_date}}</p>
</div>
<p>Continuez votre excellent travail !</p>
<p>L''équipe {{company_name}}</p>
</body></html>',
'["relay_name", "payout_amount", "transfer_reference", "iban_masked", "payment_date", "company_name"]', true),

('relay_new_parcel_deposited', 'Nouveau colis à votre relais', 'notification', 'Email envoyé au relais quand transporteur dépose un colis',
'📦 Nouveau colis déposé - {{tracking_number}}',
'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<div style="text-align: center; margin-bottom: 30px;">
  <h1 style="color: #1e3a5f;">📦 Nouveau colis reçu</h1>
</div>
<p>Bonjour {{relay_name}},</p>
<p>Un nouveau colis vient d''être déposé dans votre point relais.</p>
<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3 style="margin-top: 0;">Informations colis</h3>
  <p><strong>N° suivi :</strong> {{tracking_number}}</p>
  <p><strong>Destinataire :</strong> {{recipient_name}}</p>
  <p><strong>Transporteur :</strong> {{carrier_name}}</p>
  <p><strong>Code retrait :</strong> <span style="font-size: 20px; font-weight: bold; color: #1e3a5f;">{{pickup_code}}</span></p>
</div>
<p>Le destinataire a été notifié et viendra récupérer son colis prochainement.</p>
<p>Bonne journée,<br>L''équipe {{company_name}}</p>
</body></html>',
'["relay_name", "tracking_number", "recipient_name", "carrier_name", "pickup_code", "company_name"]', true),

('relay_parcel_collected', 'Colis récupéré', 'notification', 'Email envoyé au relais quand destinataire récupère son colis',
'✅ Colis récupéré - {{tracking_number}}',
'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<div style="text-align: center; margin-bottom: 30px;">
  <h1 style="color: #22c55e;">✅ Colis remis avec succès</h1>
</div>
<p>Bonjour {{relay_name}},</p>
<p>Le colis a été remis au destinataire.</p>
<div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <p><strong>N° suivi :</strong> {{tracking_number}}</p>
  <p><strong>Destinataire :</strong> {{recipient_name}}</p>
  <p><strong>Date/Heure :</strong> {{collected_at}}</p>
</div>
<p><strong>+{{earnings}}€</strong> ajoutés à votre solde (Total: {{total_balance}}€)</p>
<p>L''équipe {{company_name}}</p>
</body></html>',
'["relay_name", "tracking_number", "recipient_name", "collected_at", "earnings", "total_balance", "company_name"]', true),

('relay_monthly_summary', 'Récapitulatif mensuel relais', 'notification', 'Email mensuel avec stats du point relais',
'📊 Votre bilan du mois de {{month_name}}',
'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<div style="text-align: center; margin-bottom: 30px;">
  <h1 style="color: #1e3a5f;">📊 Bilan mensuel</h1>
  <p style="color: #666;">{{month_name}} {{year}}</p>
</div>
<p>Bonjour {{relay_name}},</p>
<p>Voici le récapitulatif de votre activité pour le mois écoulé.</p>
<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
  <p><strong>{{parcels_received}}</strong> reçus | <strong>{{parcels_delivered}}</strong> remis | <strong>{{total_earnings}}€</strong> gagnés</p>
</div>
<div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <p><strong>Temps moyen de retrait :</strong> {{avg_pickup_time}}</p>
  <p><strong>Solde actuel :</strong> {{current_balance}}€</p>
  <p><strong>Prochain virement :</strong> {{next_payout_info}}</p>
</div>
<div style="text-align: center; margin: 30px 0;">
  <a href="{{dashboard_url}}" style="background: #1e3a5f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Voir les détails</a>
</div>
<p>Merci pour votre engagement,<br>L''équipe {{company_name}}</p>
</body></html>',
'["relay_name", "month_name", "year", "parcels_received", "parcels_delivered", "total_earnings", "avg_pickup_time", "current_balance", "next_payout_info", "dashboard_url", "company_name"]', true)

ON CONFLICT (template_key) DO NOTHING;

-- Templates Transporteurs (6) - catégories: confirmation, notification, invoice
INSERT INTO email_templates (template_key, name, category, description, subject, html_content, variables, is_active) VALUES
('carrier_registration_confirmation', 'Confirmation inscription transporteur', 'confirmation', 'Email envoyé lors inscription transporteur',
'Bienvenue {{company_name}} - Demande d''accès API reçue',
'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<div style="text-align: center; margin-bottom: 30px;">
  <h1 style="color: #1e3a5f;">🚚 Bienvenue chez ANR !</h1>
</div>
<p>Bonjour {{contact_name}},</p>
<p>Votre demande d''inscription en tant que transporteur partenaire a bien été enregistrée.</p>
<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3 style="margin-top: 0;">📋 Informations enregistrées</h3>
  <p><strong>Société :</strong> {{company_name}}</p>
  <p><strong>SIRET :</strong> {{siret}}</p>
  <p><strong>Email contact :</strong> {{contact_email}}</p>
</div>
<p>Notre équipe va vérifier votre dossier. Une fois approuvé, vous recevrez vos identifiants API.</p>
<p>Cordialement,<br>L''équipe {{platform_name}}</p>
</body></html>',
'["contact_name", "company_name", "siret", "contact_email", "platform_name"]', true),

('carrier_verification_approved', 'Transporteur approuvé', 'notification', 'Email envoyé quand transporteur est vérifié avec clés API',
'✅ Compte approuvé - Vos accès API sont prêts',
'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<div style="text-align: center; margin-bottom: 30px;">
  <h1 style="color: #22c55e;">✅ Compte transporteur activé !</h1>
</div>
<p>Bonjour {{contact_name}},</p>
<p>Votre compte <strong>{{company_name}}</strong> a été vérifié et activé.</p>
<div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
  <h3 style="margin-top: 0; color: #1e40af;">🔐 Vos accès API</h3>
  <p><strong>Clé API :</strong></p>
  <code style="background: #1e3a5f; color: #fff; padding: 10px 15px; display: block; border-radius: 4px; word-break: break-all;">{{api_key}}</code>
  <p style="color: #666; font-size: 12px; margin-top: 10px;">⚠️ Conservez cette clé en lieu sûr.</p>
</div>
<div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <p style="margin: 0;"><strong>💰 Tarification</strong></p>
  <p style="margin: 5px 0;">Dépôt relais : {{rate_per_deposit}}€ HT/colis</p>
  <p style="margin: 5px 0;">Livraison directe : {{rate_per_delivery}}€ HT/colis</p>
</div>
<div style="text-align: center; margin: 30px 0;">
  <a href="{{dashboard_url}}" style="background: #1e3a5f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Accéder au tableau de bord</a>
</div>
<p>Bienvenue dans le réseau,<br>L''équipe {{platform_name}}</p>
</body></html>',
'["contact_name", "company_name", "api_key", "rate_per_deposit", "rate_per_delivery", "dashboard_url", "platform_name"]', true),

('carrier_verification_rejected', 'Demande transporteur refusée', 'notification', 'Email envoyé quand demande transporteur refusée',
'Votre demande d''accès nécessite des corrections',
'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<div style="text-align: center; margin-bottom: 30px;">
  <h1 style="color: #ef4444;">❌ Demande non approuvée</h1>
</div>
<p>Bonjour {{contact_name}},</p>
<p>Après examen de votre dossier pour <strong>{{company_name}}</strong>, nous ne pouvons pas approuver votre demande en l''état.</p>
<div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
  <h3 style="margin-top: 0; color: #991b1b;">Motif :</h3>
  <p>{{rejection_reason}}</p>
</div>
<p>Vous pouvez corriger ces éléments et soumettre une nouvelle demande.</p>
<div style="text-align: center; margin: 30px 0;">
  <a href="{{contact_url}}" style="background: #1e3a5f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Nous contacter</a>
</div>
<p>Cordialement,<br>L''équipe {{platform_name}}</p>
</body></html>',
'["contact_name", "company_name", "rejection_reason", "contact_url", "platform_name"]', true),

('carrier_invoice_new', 'Nouvelle facture transporteur', 'invoice', 'Email envoyé quand nouvelle facture générée',
'📄 Facture {{invoice_number}} - {{amount_ttc}}€ TTC',
'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<div style="text-align: center; margin-bottom: 30px;">
  <h1 style="color: #1e3a5f;">📄 Nouvelle facture</h1>
</div>
<p>Bonjour {{contact_name}},</p>
<p>Une nouvelle facture est disponible pour <strong>{{company_name}}</strong>.</p>
<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3 style="margin-top: 0;">Facture {{invoice_number}}</h3>
  <p><strong>Période :</strong> {{period_start}} au {{period_end}}</p>
  <p><strong>Colis traités :</strong> {{parcels_count}}</p>
  <p><strong>Montant HT :</strong> {{amount_ht}}€</p>
  <p><strong>TVA ({{vat_rate}}%) :</strong> {{vat_amount}}€</p>
  <p style="font-size: 18px; font-weight: bold;"><strong>Total TTC :</strong> {{amount_ttc}}€</p>
</div>
<div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <p style="margin: 0;"><strong>📅 Date limite de paiement :</strong> {{due_date}}</p>
</div>
<div style="text-align: center; margin: 30px 0;">
  <a href="{{download_url}}" style="background: #1e3a5f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Télécharger la facture</a>
</div>
<p>Cordialement,<br>L''équipe {{platform_name}}</p>
</body></html>',
'["contact_name", "company_name", "invoice_number", "period_start", "period_end", "parcels_count", "amount_ht", "vat_rate", "vat_amount", "amount_ttc", "due_date", "download_url", "platform_name"]', true),

('carrier_invoice_reminder', 'Rappel facture impayée', 'invoice', 'Email de rappel pour facture en retard',
'⚠️ Rappel : Facture {{invoice_number}} en attente',
'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<div style="text-align: center; margin-bottom: 30px;">
  <h1 style="color: #f59e0b;">⚠️ Facture en attente</h1>
</div>
<p>Bonjour {{contact_name}},</p>
<p>Nous n''avons pas encore reçu le règlement de la facture <strong>{{invoice_number}}</strong>.</p>
<div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
  <p><strong>Montant :</strong> {{amount_ttc}}€ TTC</p>
  <p><strong>Date d''échéance :</strong> {{due_date}}</p>
  <p><strong>Jours de retard :</strong> {{days_overdue}}</p>
</div>
<p>Merci de procéder au règlement dans les plus brefs délais.</p>
<div style="text-align: center; margin: 30px 0;">
  <a href="{{payment_url}}" style="background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Payer maintenant</a>
</div>
<p>Si vous avez déjà effectué le paiement, veuillez ignorer ce message.</p>
<p>Cordialement,<br>L''équipe {{platform_name}}</p>
</body></html>',
'["contact_name", "invoice_number", "amount_ttc", "due_date", "days_overdue", "payment_url", "platform_name"]', true),

('carrier_api_key_generated', 'Nouvelle clé API', 'notification', 'Email envoyé quand nouvelle clé API générée',
'🔑 Nouvelle clé API générée',
'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<div style="text-align: center; margin-bottom: 30px;">
  <h1 style="color: #1e3a5f;">🔑 Nouvelle clé API</h1>
</div>
<p>Bonjour {{contact_name}},</p>
<p>Une nouvelle clé API a été générée pour <strong>{{company_name}}</strong>.</p>
<div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <p style="margin: 0;">⚠️ <strong>Attention :</strong> L''ancienne clé a été révoquée.</p>
</div>
<div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3 style="margin-top: 0;">Nouvelle clé API :</h3>
  <code style="background: #1e3a5f; color: #fff; padding: 10px 15px; display: block; border-radius: 4px; word-break: break-all;">{{api_key}}</code>
</div>
<p>Mettez à jour vos systèmes avec cette nouvelle clé.</p>
<p>Cordialement,<br>L''équipe {{platform_name}}</p>
</body></html>',
'["contact_name", "company_name", "api_key", "platform_name"]', true)

ON CONFLICT (template_key) DO NOTHING;

-- Templates Colis/Destinataires (3)
INSERT INTO email_templates (template_key, name, category, description, subject, html_content, variables, is_active) VALUES
('parcel_deposited_recipient', 'Colis disponible en relais', 'notification', 'Email au destinataire quand colis déposé en relais',
'📦 Votre colis {{tracking_number}} vous attend !',
'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<div style="text-align: center; margin-bottom: 30px;">
  <h1 style="color: #1e3a5f;">📦 Colis disponible !</h1>
</div>
<p>Bonjour {{recipient_name}},</p>
<p>Votre colis est arrivé et vous attend au point relais.</p>
<div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
  <h2 style="margin: 0 0 10px; color: #1e3a5f;">Code de retrait</h2>
  <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1e3a5f;">{{pickup_code}}</div>
</div>
<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3 style="margin-top: 0;">📍 Point relais</h3>
  <p><strong>{{relay_name}}</strong></p>
  <p>{{relay_address}}</p>
  <p>📞 {{relay_phone}}</p>
</div>
<div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <p style="margin: 0;"><strong>⏰ À récupérer avant le :</strong> {{expiry_date}}</p>
</div>
<p>N''oubliez pas votre pièce d''identité !</p>
<p>L''équipe {{platform_name}}</p>
</body></html>',
'["recipient_name", "tracking_number", "pickup_code", "relay_name", "relay_address", "relay_phone", "expiry_date", "carrier_name", "platform_name"]', true),

('parcel_pickup_reminder', 'Rappel colis à récupérer', 'notification', 'Email de rappel pour récupérer le colis',
'⏰ Rappel : Votre colis expire dans {{days_left}} jours',
'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<div style="text-align: center; margin-bottom: 30px;">
  <h1 style="color: #f59e0b;">⏰ N''oubliez pas votre colis !</h1>
</div>
<p>Bonjour {{recipient_name}},</p>
<p>Votre colis vous attend toujours au point relais.</p>
<div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border-left: 4px solid #f59e0b;">
  <p style="font-size: 18px; margin: 0;"><strong>Il vous reste {{days_left}} jours</strong></p>
  <p style="margin: 10px 0 0;">pour récupérer votre colis.</p>
</div>
<div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
  <p style="margin: 0 0 10px;">Code de retrait</p>
  <div style="font-size: 28px; font-weight: bold; color: #1e3a5f;">{{pickup_code}}</div>
</div>
<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <p style="margin: 0;"><strong>📍 {{relay_name}}</strong></p>
  <p style="margin: 5px 0;">{{relay_address}}</p>
</div>
<p>L''équipe {{platform_name}}</p>
</body></html>',
'["recipient_name", "days_left", "pickup_code", "relay_name", "relay_address", "platform_name"]', true),

('parcel_delivered', 'Colis livré', 'notification', 'Email de confirmation livraison directe',
'✅ Votre colis {{tracking_number}} a été livré',
'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<div style="text-align: center; margin-bottom: 30px;">
  <h1 style="color: #22c55e;">✅ Colis livré !</h1>
</div>
<p>Bonjour {{recipient_name}},</p>
<p>Votre colis a été livré avec succès.</p>
<div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3 style="margin-top: 0; color: #166534;">Détails de la livraison</h3>
  <p><strong>N° de suivi :</strong> {{tracking_number}}</p>
  <p><strong>Livré le :</strong> {{delivery_date}}</p>
  <p><strong>Livré à :</strong> {{delivery_location}}</p>
  <p><strong>Signé par :</strong> {{signed_by}}</p>
</div>
<p>Merci d''avoir utilisé notre service !</p>
<p>L''équipe {{platform_name}}</p>
</body></html>',
'["recipient_name", "tracking_number", "delivery_date", "delivery_location", "signed_by", "platform_name"]', true)

ON CONFLICT (template_key) DO NOTHING;