-- Create a security definer function to check if user is owner of a habitation
CREATE OR REPLACE FUNCTION public.is_owner_of(_user_id uuid, _habitation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.residents
    WHERE user_id = _user_id 
      AND habitation_id = _habitation_id 
      AND is_owner = true
      AND status = 'verified'
  )
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view residents of their habitations" ON public.residents;
DROP POLICY IF EXISTS "Owners can manage residents" ON public.residents;
DROP POLICY IF EXISTS "Owners can delete residents" ON public.residents;

-- Recreate policies using security definer functions
CREATE POLICY "Users can view residents of their habitations" 
ON public.residents 
FOR SELECT 
USING (
  user_id = auth.uid() 
  OR is_resident_of(auth.uid(), habitation_id)
);

CREATE POLICY "Owners can manage residents" 
ON public.residents 
FOR UPDATE 
USING (
  user_id = auth.uid() 
  OR is_owner_of(auth.uid(), habitation_id)
);

CREATE POLICY "Owners can delete residents" 
ON public.residents 
FOR DELETE 
USING (
  is_owner_of(auth.uid(), habitation_id)
);