-- Add device_id to profiles for device binding
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS device_id TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_profiles_device_id ON profiles(device_id);

-- Add event_token and device_id to phone_verifications for OVH polling
ALTER TABLE phone_verifications ADD COLUMN IF NOT EXISTS event_token TEXT;
ALTER TABLE phone_verifications ADD COLUMN IF NOT EXISTS device_id TEXT;