-- Drop the existing INSERT policy and create a more flexible one
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;

-- Create a new INSERT policy that allows authenticated users to send messages as themselves
CREATE POLICY "Users can send messages" 
ON public.messages 
FOR INSERT 
TO authenticated
WITH CHECK (sender_id = auth.uid());