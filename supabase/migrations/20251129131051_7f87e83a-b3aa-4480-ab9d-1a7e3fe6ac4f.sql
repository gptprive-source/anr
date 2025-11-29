-- Fix search_path on update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix search_path on check_max_residents function
CREATE OR REPLACE FUNCTION public.check_max_residents()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.residents WHERE habitation_id = NEW.habitation_id) >= 5 THEN
    RAISE EXCEPTION 'Maximum 5 residents per habitation';
  END IF;
  RETURN NEW;
END;
$$;