-- Create storage bucket for custom ringtones
INSERT INTO storage.buckets (id, name, public)
VALUES ('ringtones', 'ringtones', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own ringtones
CREATE POLICY "Users can upload their own ringtones"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ringtones' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own ringtones
CREATE POLICY "Users can read their own ringtones"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'ringtones' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read for ringtones (for playback)
CREATE POLICY "Anyone can read ringtones"
ON storage.objects FOR SELECT
USING (bucket_id = 'ringtones');

-- Allow users to delete their own ringtones
CREATE POLICY "Users can delete their own ringtones"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ringtones' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);