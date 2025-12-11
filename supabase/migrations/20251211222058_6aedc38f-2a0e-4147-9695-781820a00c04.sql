-- First, add 'facturation' to the allowed categories
ALTER TABLE app_config DROP CONSTRAINT IF EXISTS app_config_category_check;
ALTER TABLE app_config ADD CONSTRAINT app_config_category_check CHECK (category IN ('pricing', 'limits', 'features', 'plans', 'content', 'facturation'));

-- Insert invoice company configuration
INSERT INTO app_config (key, category, value, description) VALUES 
('invoice_company_name', 'facturation', '"ANR - Adresse Numérique Résidentielle"', 'Nom de l''entreprise sur les factures'),
('invoice_siret', 'facturation', '"123 456 789 00000"', 'Numéro SIRET sur les factures'),
('invoice_tva', 'facturation', '"FR12345678900"', 'Numéro de TVA intracommunautaire'),
('invoice_address', 'facturation', '"1 rue de l''Innovation, 75001 Paris"', 'Adresse de l''entreprise'),
('invoice_contact_email', 'facturation', '"contact@soqotomobil.com"', 'Email de contact sur les factures')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;