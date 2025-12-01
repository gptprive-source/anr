-- Enable realtime for call_participants table
ALTER TABLE public.call_participants REPLICA IDENTITY FULL;

-- Add table to realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'call_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.call_participants;
  END IF;
END $$;

-- Also enable for call_logs
ALTER TABLE public.call_logs REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'call_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.call_logs;
  END IF;
END $$;