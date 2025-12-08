-- Add copilot global enabled configuration
INSERT INTO app_config (key, value, category, description)
VALUES ('copilot_global_enabled', 'false', 'content', 'Activer le Co-Pilot pour tous les utilisateurs PRO (test gratuit)')
ON CONFLICT (key) DO NOTHING;