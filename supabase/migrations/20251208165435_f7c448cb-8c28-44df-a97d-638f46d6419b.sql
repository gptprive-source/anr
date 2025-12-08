-- Add chatbot AI mode configuration
INSERT INTO app_config (key, value, category, description)
VALUES ('chatbot_ai_mode_enabled', 'false', 'content', 'Activer le mode IA global du chatbot (désactive la recherche FAQ)')
ON CONFLICT (key) DO NOTHING;