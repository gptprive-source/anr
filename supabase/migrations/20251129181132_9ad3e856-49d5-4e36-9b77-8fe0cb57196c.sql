-- Create signaling table for WebRTC
CREATE TABLE public.call_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID NOT NULL,
  sender_id TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  signal_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert signals (visitors don't have auth)
CREATE POLICY "Anyone can insert signals"
ON public.call_signals
FOR INSERT
WITH CHECK (true);

-- Allow anyone to select signals for their call
CREATE POLICY "Anyone can view signals"
ON public.call_signals
FOR SELECT
USING (true);

-- Allow deletion of old signals
CREATE POLICY "Anyone can delete signals"
ON public.call_signals
FOR DELETE
USING (true);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals;

-- Create index for faster queries
CREATE INDEX idx_call_signals_call_id ON public.call_signals(call_id);

-- Auto-delete old signals after 5 minutes
CREATE OR REPLACE FUNCTION cleanup_old_signals()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.call_signals WHERE created_at < NOW() - INTERVAL '5 minutes';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_cleanup_old_signals
AFTER INSERT ON public.call_signals
FOR EACH STATEMENT
EXECUTE FUNCTION cleanup_old_signals();