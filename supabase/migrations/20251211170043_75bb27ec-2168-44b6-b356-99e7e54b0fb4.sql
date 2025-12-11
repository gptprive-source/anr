-- Add media columns to message_replies table
ALTER TABLE public.message_replies 
ADD COLUMN IF NOT EXISTS reply_media_url text,
ADD COLUMN IF NOT EXISTS reply_media_type text;