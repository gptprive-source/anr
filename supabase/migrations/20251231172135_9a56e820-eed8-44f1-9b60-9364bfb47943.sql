-- Supprimer l'utilisateur orphelin de auth.users via SQL
-- Note: Cette suppression sera effectuée par l'admin

-- D'abord on nettoie les éventuelles données résiduelles
DELETE FROM push_tokens WHERE user_id = '9723f853-07d4-46e5-a9b0-e546a7de0382';
DELETE FROM user_roles WHERE user_id = '9723f853-07d4-46e5-a9b0-e546a7de0382';
DELETE FROM profiles WHERE id = '9723f853-07d4-46e5-a9b0-e546a7de0382';