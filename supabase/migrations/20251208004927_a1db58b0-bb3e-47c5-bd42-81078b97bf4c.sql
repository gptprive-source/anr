-- Add guest columns to door_scheduled_access for guests without ANR accounts
ALTER TABLE public.door_scheduled_access
ADD COLUMN IF NOT EXISTS guest_name TEXT,
ADD COLUMN IF NOT EXISTS guest_contact TEXT,
ADD COLUMN IF NOT EXISTS access_code TEXT UNIQUE;

-- Create index for access_code lookups
CREATE INDEX IF NOT EXISTS idx_door_scheduled_access_code ON public.door_scheduled_access(access_code) WHERE access_code IS NOT NULL;