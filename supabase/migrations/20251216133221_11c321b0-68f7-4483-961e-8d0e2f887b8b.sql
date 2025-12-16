-- Add media support columns to visitor_messages table
ALTER TABLE public.visitor_messages 
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_type TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.visitor_messages.media_url IS 'URL of attached media (image or video)';
COMMENT ON COLUMN public.visitor_messages.media_type IS 'Type of media: image or video';