-- Add foreign key constraint from residents.user_id to profiles.id
-- This enables Supabase to perform automatic relational joins

ALTER TABLE residents
ADD CONSTRAINT fk_residents_user_id_profiles 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;