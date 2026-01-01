-- Phase 1: Create unified messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  habitation_id UUID REFERENCES public.habitations(id),
  message TEXT,
  voice_message_url TEXT,
  media_url TEXT,
  media_type TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_by_sender BOOLEAN DEFAULT FALSE,
  deleted_by_recipient BOOLEAN DEFAULT FALSE
);

-- Create indexes for performance
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX idx_messages_habitation_id ON public.messages(habitation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages they sent or received (unless deleted)
CREATE POLICY "Users can view their messages"
ON public.messages
FOR SELECT
USING (
  (auth.uid() = sender_id AND deleted_by_sender = FALSE)
  OR (auth.uid() = recipient_id AND deleted_by_recipient = FALSE)
);

-- Policy: Authenticated users can send messages
CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Policy: Users can update their own messages (mark as read, delete)
CREATE POLICY "Recipients can mark messages as read"
ON public.messages
FOR UPDATE
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "Senders can soft delete their messages"
ON public.messages
FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- Policy: Admins can view all messages
CREATE POLICY "Admins can view all messages"
ON public.messages
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);