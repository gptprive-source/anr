-- Create daily_usage_logs table for tracking Daily.co call costs
CREATE TABLE public.daily_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES public.call_logs(id) ON DELETE SET NULL,
  room_name TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  participant_count INTEGER NOT NULL DEFAULT 1,
  participant_minutes NUMERIC(10, 2) NOT NULL DEFAULT 0,
  is_video BOOLEAN NOT NULL DEFAULT false,
  is_group_call BOOLEAN NOT NULL DEFAULT false,
  estimated_cost_usd NUMERIC(10, 4) NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_usage_logs ENABLE ROW LEVEL SECURITY;

-- Allow admins to read all logs
CREATE POLICY "Admins can view daily usage logs"
  ON public.daily_usage_logs
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Allow service role to insert logs
CREATE POLICY "Service role can insert daily usage logs"
  ON public.daily_usage_logs
  FOR INSERT
  WITH CHECK (true);

-- Create index for efficient querying
CREATE INDEX idx_daily_usage_logs_started_at ON public.daily_usage_logs(started_at DESC);
CREATE INDEX idx_daily_usage_logs_call_id ON public.daily_usage_logs(call_id);