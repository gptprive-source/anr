-- Add avatar_url column to visitor_business_cards
ALTER TABLE public.visitor_business_cards 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add avatar_url column to resident_contacts
ALTER TABLE public.resident_contacts 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for avatars bucket
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars');

CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars');