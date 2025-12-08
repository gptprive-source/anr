-- Ajouter les paramètres app_config manquants avec catégories valides
INSERT INTO app_config (key, value, category, description) VALUES
  ('face_verification_threshold', '"0.85"', 'limits', 'Seuil de similarité pour la vérification faciale (0.0-1.0)'),
  ('daily_cost_per_video_minute', '"0.004"', 'limits', 'Coût par minute vidéo Daily.co en USD'),
  ('daily_cost_per_audio_minute', '"0.002"', 'limits', 'Coût par minute audio Daily.co en USD'),
  ('daily_cost_alert_threshold', '"100"', 'limits', 'Seuil d''alerte budget Daily.co en USD'),
  ('visitor_message_retention_days', '"30"', 'limits', 'Durée de conservation des messages visiteurs en jours'),
  ('visitor_business_card_retention_days', '"365"', 'limits', 'Durée de conservation des cartes de visite en jours'),
  ('visitor_template_retention_days', '"365"', 'limits', 'Durée de conservation des templates personnalisés en jours')
ON CONFLICT (key) DO NOTHING;