-- Add all plan-specific configuration parameters
INSERT INTO app_config (key, value, category, description) VALUES
-- Particulier plan
('particulier_annual_price', '19', 'pricing', 'Prix abonnement annuel Particulier'),
('particulier_doming_price', '10', 'pricing', 'Prix Doming supplémentaire Particulier'),
('particulier_members_included', '7', 'pricing', 'Membres inclus Particulier'),
('particulier_max_extra_members', '0', 'pricing', 'Membres supplémentaires max Particulier'),
('particulier_extra_member_price', '0', 'pricing', 'Prix par membre supplémentaire Particulier'),
('particulier_copilot', 'false', 'pricing', 'Co-Pilot IA inclus Particulier'),
('particulier_geolocation', 'false', 'pricing', 'Géolocalisation incluse Particulier'),
('particulier_scheduling', 'true', 'pricing', 'Planification accès incluse Particulier'),
('particulier_facial_recognition', 'false', 'pricing', 'Reconnaissance faciale incluse Particulier'),

-- Pro plan
('pro_annual_price', '348', 'pricing', 'Prix abonnement annuel Pro (29€/mois)'),
('pro_doming_price', '7', 'pricing', 'Prix Doming supplémentaire Pro'),
('pro_members_included', '10', 'pricing', 'Membres/employés inclus Pro'),
('pro_max_extra_members', '50', 'pricing', 'Membres supplémentaires max Pro'),
('pro_extra_member_price', '2', 'pricing', 'Prix par membre supplémentaire Pro'),
('pro_copilot', 'false', 'pricing', 'Co-Pilot IA inclus Pro'),
('pro_geolocation', 'false', 'pricing', 'Géolocalisation incluse Pro'),
('pro_scheduling', 'true', 'pricing', 'Planification accès incluse Pro'),
('pro_facial_recognition', 'false', 'pricing', 'Reconnaissance faciale incluse Pro'),

-- Entreprise plan
('entreprise_annual_price', '1188', 'pricing', 'Prix abonnement annuel Entreprise (99€/mois)'),
('entreprise_doming_price', '5', 'pricing', 'Prix Doming supplémentaire Entreprise'),
('entreprise_members_included', '50', 'pricing', 'Membres/employés inclus Entreprise'),
('entreprise_max_extra_members', '200', 'pricing', 'Membres supplémentaires max Entreprise'),
('entreprise_extra_member_price', '1.5', 'pricing', 'Prix par membre supplémentaire Entreprise'),
('entreprise_copilot', 'true', 'pricing', 'Co-Pilot IA inclus Entreprise'),
('entreprise_geolocation', 'true', 'pricing', 'Géolocalisation incluse Entreprise'),
('entreprise_scheduling', 'true', 'pricing', 'Planification accès incluse Entreprise'),
('entreprise_facial_recognition', 'true', 'pricing', 'Reconnaissance faciale incluse Entreprise'),

-- Collectivités plan
('collectivites_annual_price', '2388', 'pricing', 'Prix abonnement annuel Collectivités (199€/mois)'),
('collectivites_doming_price', '3', 'pricing', 'Prix Doming supplémentaire Collectivités'),
('collectivites_members_included', '200', 'pricing', 'Membres/employés inclus Collectivités'),
('collectivites_max_extra_members', '1000', 'pricing', 'Membres supplémentaires max Collectivités'),
('collectivites_extra_member_price', '1', 'pricing', 'Prix par membre supplémentaire Collectivités'),
('collectivites_copilot', 'true', 'pricing', 'Co-Pilot IA inclus Collectivités'),
('collectivites_geolocation', 'true', 'pricing', 'Géolocalisation incluse Collectivités'),
('collectivites_scheduling', 'true', 'pricing', 'Planification accès incluse Collectivités'),
('collectivites_facial_recognition', 'true', 'pricing', 'Reconnaissance faciale incluse Collectivités')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description, category = EXCLUDED.category;