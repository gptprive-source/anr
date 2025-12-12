-- Nettoyer les tables liées pour le nouveau compte de Khadija
DELETE FROM push_tokens WHERE user_id = 'df330b54-2a9c-4385-bf02-1055995da6c5';
DELETE FROM call_participants WHERE user_id = 'df330b54-2a9c-4385-bf02-1055995da6c5';
DELETE FROM referral_codes WHERE user_id = 'df330b54-2a9c-4385-bf02-1055995da6c5';
DELETE FROM user_notifications WHERE user_id = 'df330b54-2a9c-4385-bf02-1055995da6c5';

-- Supprimer l'utilisateur (cascade vers profiles)
DELETE FROM auth.users WHERE id = 'df330b54-2a9c-4385-bf02-1055995da6c5';