-- Recréer la policy avec le bon nom de table
CREATE POLICY "Users can view replies on their communications"
ON communication_replies
FOR SELECT
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM user_communication_reads ucr
    WHERE ucr.communication_id = communication_replies.communication_id
    AND ucr.user_id = auth.uid()
  )
);