INSERT INTO user_notifications (user_id, type, title, message, data)
VALUES (
  '1eaf3a87-03ff-4c97-acf1-f714cc8959d1',
  'test_message',
  '🔔 Test de messagerie',
  'Ceci est un message de test pour vérifier que la messagerie in-app fonctionne correctement !',
  '{"test": true}'::jsonb
);