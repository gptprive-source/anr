-- Add fields to track which user has deleted the chat
ALTER TABLE public.chats 
ADD COLUMN IF NOT EXISTS deleted_for_p1 boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_for_p2 boolean DEFAULT false;