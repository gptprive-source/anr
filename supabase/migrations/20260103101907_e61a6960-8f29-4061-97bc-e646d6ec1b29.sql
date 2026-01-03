-- Enable REPLICA IDENTITY FULL for realtime updates
ALTER TABLE device_auth_sessions REPLICA IDENTITY FULL;

-- Add table to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE device_auth_sessions;