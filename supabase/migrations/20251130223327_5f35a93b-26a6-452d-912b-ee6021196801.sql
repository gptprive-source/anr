-- Fix habitations RLS policy - make it permissive
DROP POLICY IF EXISTS "Anyone can view habitations" ON public.habitations;

CREATE POLICY "Anyone can view habitations" 
ON public.habitations 
FOR SELECT 
TO public
USING (true);