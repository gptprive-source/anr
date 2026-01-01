-- Drop and recreate the UPDATE policy with explicit role
DROP POLICY IF EXISTS "Users can update deletion flags on their messages" ON public.messages;

CREATE POLICY "Users can update deletion flags on their messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = recipient_id)
WITH CHECK (auth.uid() = sender_id OR auth.uid() = recipient_id);