-- Fix the habitations update policy that has a bug
DROP POLICY IF EXISTS "Owners can update habitations" ON public.habitations;

CREATE POLICY "Owners can update habitations" 
ON public.habitations 
FOR UPDATE 
USING (
  is_owner_of(auth.uid(), id)
);