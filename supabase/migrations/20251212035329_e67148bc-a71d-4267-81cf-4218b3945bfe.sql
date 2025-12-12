-- Nettoyer les tables liées
DELETE FROM push_tokens WHERE user_id = '5e80887b-0281-47d3-a8bf-81c6d327b081';
DELETE FROM call_participants WHERE user_id = '5e80887b-0281-47d3-a8bf-81c6d327b081';
DELETE FROM referral_codes WHERE user_id = '5e80887b-0281-47d3-a8bf-81c6d327b081';
DELETE FROM user_notifications WHERE user_id = '5e80887b-0281-47d3-a8bf-81c6d327b081';

-- Supprimer l'utilisateur (cascade vers profiles)
DELETE FROM auth.users WHERE id = '5e80887b-0281-47d3-a8bf-81c6d327b081';