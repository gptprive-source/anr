-- Add min_call_duration_for_message_seconds to app_config
INSERT INTO app_config (key, value, description, category)
VALUES (
  'min_call_duration_for_message_seconds',
  '5',
  'Temps minimum d''appel sans réponse avant de proposer la messagerie (en secondes)',
  'limits'
) ON CONFLICT (key) DO NOTHING;