-- Update the bucket to allow images and videos
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'audio/webm', 
  'audio/mp4', 
  'audio/mpeg', 
  'audio/ogg',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime'
]
WHERE id = 'visitor-voice-messages';