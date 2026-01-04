-- Add relay_address column to store the relay's actual address (can differ from ANR address)
ALTER TABLE public.relay_points 
ADD COLUMN IF NOT EXISTS relay_address TEXT;