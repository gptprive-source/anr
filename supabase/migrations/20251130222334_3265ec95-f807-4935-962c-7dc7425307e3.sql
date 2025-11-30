-- Drop the restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Anyone can view ANRs" ON public.anrs;

CREATE POLICY "Anyone can view ANRs" 
ON public.anrs 
FOR SELECT 
TO public
USING (true);