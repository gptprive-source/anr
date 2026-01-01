-- Supprimer TOUS les messages de la table messages
DELETE FROM messages;

-- Supprimer aussi les anciennes données des tables liées si elles existent
DELETE FROM message_replies;