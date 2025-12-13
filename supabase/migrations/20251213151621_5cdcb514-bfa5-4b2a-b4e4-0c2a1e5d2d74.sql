-- 1. Ajouter la policy DELETE sur user_notifications
CREATE POLICY "Users can delete their own notifications"
ON user_notifications
FOR DELETE
USING (auth.uid() = user_id);

-- 2. Ajouter colonne is_hidden à user_communication_reads
ALTER TABLE user_communication_reads
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;