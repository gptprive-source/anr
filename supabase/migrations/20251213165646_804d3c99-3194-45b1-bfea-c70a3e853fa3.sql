-- Add receive_visitor_messages column to residents table
-- Owner (is_owner = true) always receives messages implicitly
-- Invited residents can have this enabled by the owner
ALTER TABLE public.residents 
ADD COLUMN IF NOT EXISTS receive_visitor_messages boolean DEFAULT false;

-- Update existing owners to have receive_visitor_messages = true
UPDATE public.residents 
SET receive_visitor_messages = true 
WHERE is_owner = true;

-- Create a trigger to automatically set receive_visitor_messages = true for owners
CREATE OR REPLACE FUNCTION public.set_owner_receives_messages()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_owner = true THEN
    NEW.receive_visitor_messages = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER ensure_owner_receives_messages
BEFORE INSERT OR UPDATE ON public.residents
FOR EACH ROW
EXECUTE FUNCTION public.set_owner_receives_messages();