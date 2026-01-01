-- Activer REPLICA IDENTITY FULL pour le tracking complet des changements Realtime
ALTER TABLE chats REPLICA IDENTITY FULL;
ALTER TABLE chat_messages REPLICA IDENTITY FULL;

-- Ajouter les tables à la publication realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chats;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;