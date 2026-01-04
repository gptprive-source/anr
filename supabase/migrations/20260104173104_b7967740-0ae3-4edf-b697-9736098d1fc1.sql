-- Add unsubscription columns for relay points with 30 days notice period
ALTER TABLE public.relay_points
ADD COLUMN IF NOT EXISTS unsubscribe_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS unsubscribe_effective_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS unsubscribe_reason TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.relay_points.unsubscribe_requested_at IS 'Date when the relay operator requested to unsubscribe';
COMMENT ON COLUMN public.relay_points.unsubscribe_effective_at IS 'Date when the unsubscription becomes effective (30 days after request)';
COMMENT ON COLUMN public.relay_points.unsubscribe_reason IS 'Reason provided by the relay operator for unsubscribing';