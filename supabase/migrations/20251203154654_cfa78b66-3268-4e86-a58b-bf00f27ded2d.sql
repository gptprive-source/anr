-- Allow residents to view profiles of co-residents in the same habitation
CREATE POLICY "Residents can view co-residents profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.residents r1
    JOIN public.residents r2 ON r1.habitation_id = r2.habitation_id
    WHERE r1.user_id = auth.uid()
    AND r2.user_id = profiles.id
    AND r1.status = 'verified'
    AND r2.status = 'verified'
  )
);