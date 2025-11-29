-- Fix search_path for cleanup_old_signals function
CREATE OR REPLACE FUNCTION cleanup_old_signals()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.call_signals WHERE created_at < NOW() - INTERVAL '5 minutes';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;