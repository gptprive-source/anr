-- Add voice_message_url column to visitor_messages table
ALTER TABLE visitor_messages 
ADD COLUMN IF NOT EXISTS voice_message_url TEXT;

-- Make message column nullable (since messages can be voice-only)
ALTER TABLE visitor_messages 
ALTER COLUMN message DROP NOT NULL;

-- Create storage bucket for visitor voice messages
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'visitor-voice-messages',
  'visitor-voice-messages', 
  true,
  5242880, -- 5MB limit
  ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for visitor voice messages
CREATE POLICY "Anyone can upload visitor voice messages"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'visitor-voice-messages');

CREATE POLICY "Anyone can view visitor voice messages"
ON storage.objects FOR SELECT
USING (bucket_id = 'visitor-voice-messages');

-- Allow deletion by authenticated users (residents cleaning up their messages)
CREATE POLICY "Authenticated users can delete visitor voice messages"
ON storage.objects FOR DELETE
USING (bucket_id = 'visitor-voice-messages' AND auth.role() = 'authenticated');