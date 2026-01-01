-- Add visitor_device_id to call_logs to link calls to visitor conversations
ALTER TABLE call_logs ADD COLUMN visitor_device_id TEXT;

-- Add index for faster lookups
CREATE INDEX idx_call_logs_visitor_device_id ON call_logs(visitor_device_id) WHERE visitor_device_id IS NOT NULL;