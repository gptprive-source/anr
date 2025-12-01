-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create cron job to cleanup stale calls every minute
SELECT cron.schedule(
  'cleanup-stale-calls',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://mkzpdmyymabgsntwmmir.supabase.co/functions/v1/cleanup-stale-calls',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1renBkbXl5bWFiZ3NudHdtbWlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNzkxNjUsImV4cCI6MjA3OTg1NTE2NX0.mNNdq165aH8VP10MidxuRLM2_Ea3ZV85NjfobN7Ams0"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);