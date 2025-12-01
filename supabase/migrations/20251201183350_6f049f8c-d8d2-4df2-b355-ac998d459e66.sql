-- Create resident_invitations table
CREATE TABLE public.resident_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  habitation_id UUID NOT NULL REFERENCES public.habitations(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL,
  email TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by UUID
);

-- Enable RLS
ALTER TABLE public.resident_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Owners can create invitations"
ON public.resident_invitations
FOR INSERT
WITH CHECK (is_owner_of(auth.uid(), habitation_id));

CREATE POLICY "Owners can view invitations"
ON public.resident_invitations
FOR SELECT
USING (is_owner_of(auth.uid(), habitation_id) OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Owners can delete invitations"
ON public.resident_invitations
FOR DELETE
USING (is_owner_of(auth.uid(), habitation_id));

CREATE POLICY "Anyone can view invitation by code"
ON public.resident_invitations
FOR SELECT
USING (true);

-- Update max residents from 5 to 7
CREATE OR REPLACE FUNCTION public.check_max_residents()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.residents WHERE habitation_id = NEW.habitation_id) >= 7 THEN
    RAISE EXCEPTION 'Maximum 7 residents per habitation';
  END IF;
  RETURN NEW;
END;
$$;