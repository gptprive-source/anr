-- Add ringtone_uri column to profiles table for custom ringtone selection
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS ringtone_uri TEXT DEFAULT 'default';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.ringtone_uri IS 'URI of the user selected ringtone for incoming calls';