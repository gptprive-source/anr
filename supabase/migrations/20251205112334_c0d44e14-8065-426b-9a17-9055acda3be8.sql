-- Enable REPLICA IDENTITY FULL for real-time updates
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;

-- Add table to supabase_realtime publication for real-time updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;