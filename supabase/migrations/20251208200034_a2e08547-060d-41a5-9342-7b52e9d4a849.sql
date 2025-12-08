-- Add offer descriptions to app_config
INSERT INTO app_config (key, value, category, description) VALUES
('particulier_description', '"Pour les propriétaires et locataires souhaitant installer un interphone numérique à leur domicile."', 'pricing', 'Description offre Particulier'),
('particulier_features', '["1 Doming gratuit pour nouvelle adresse", "Jusqu''à 7 résidents par habitation", "Appels vidéo avec les visiteurs", "Accès programmés (nounou, livreurs...)"]', 'pricing', 'Avantages offre Particulier'),
('pro_description', '"Pour les petites entreprises de services à domicile."', 'pricing', 'Description offre Pro'),
('pro_features', '["Gestion des employés et missions", "Horodatage entrées/sorties automatique", "Signature client digitale", "Rapports et exports"]', 'pricing', 'Avantages offre Pro'),
('entreprise_description', '"Pour les entreprises de services à domicile, aide à la personne, maintenance."', 'pricing', 'Description offre Entreprise'),
('entreprise_features', '["Toutes les fonctionnalités Pro", "Co-Pilot IA inclus", "Géofencing et reconnaissance faciale", "Webhooks pour intégration RH/Paie"]', 'pricing', 'Avantages offre Entreprise'),
('collectivites_description', '"Pour les collectivités territoriales et grandes organisations."', 'pricing', 'Description offre Collectivités'),
('collectivites_features', '["Toutes les fonctionnalités Entreprise", "Support dédié", "Déploiement personnalisé", "Facturation sur devis"]', 'pricing', 'Avantages offre Collectivités')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;