-- Add pricing configuration for individuals and PRO offers
INSERT INTO app_config (key, value, category, description) VALUES
  ('pro_plan_price', '29', 'pricing', 'Prix mensuel du plan PRO (€)'),
  ('entreprise_plan_price', '99', 'pricing', 'Prix mensuel du plan ENTREPRISE (€)'),
  ('collectivites_plan_price', '199', 'pricing', 'Prix mensuel du plan COLLECTIVITÉS (€)'),
  ('copilot_addon_price', '9.99', 'pricing', 'Prix mensuel addon Co-Pilot (€)'),
  ('geofencing_addon_price', '4.99', 'pricing', 'Prix mensuel addon Géolocalisation (€)'),
  ('facial_recognition_addon_price', '7.99', 'pricing', 'Prix mensuel addon Reconnaissance faciale (€)'),
  ('pro_max_employees_base', '10', 'limits', 'Nombre max d''employés inclus dans le plan PRO de base'),
  ('pro_price_per_extra_employee', '2', 'pricing', 'Prix mensuel par employé supplémentaire (€)')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;