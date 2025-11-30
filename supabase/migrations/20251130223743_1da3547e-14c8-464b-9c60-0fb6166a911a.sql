-- Fix residents SELECT policy to allow reading for call creation
DROP POLICY IF EXISTS "Users can view residents of their habitations" ON public.residents;

CREATE POLICY "Anyone can view residents" 
ON public.residents 
FOR SELECT 
TO anon, authenticated
USING (true);