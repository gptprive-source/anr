-- Add encryption columns to visitor_messages
ALTER TABLE public.visitor_messages 
ADD COLUMN IF NOT EXISTS encrypted_message TEXT,
ADD COLUMN IF NOT EXISTS message_nonce TEXT,
ADD COLUMN IF NOT EXISTS visitor_public_key TEXT,
ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false;

-- Add encryption columns to message_replies
ALTER TABLE public.message_replies 
ADD COLUMN IF NOT EXISTS encrypted_reply TEXT,
ADD COLUMN IF NOT EXISTS reply_nonce TEXT,
ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false;

-- Create conversation_keys table for E2E key exchange
CREATE TABLE IF NOT EXISTS public.conversation_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  habitation_id UUID REFERENCES public.habitations(id) ON DELETE CASCADE,
  resident_public_key TEXT,
  visitor_public_key TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, habitation_id)
);

-- Enable RLS on conversation_keys
ALTER TABLE public.conversation_keys ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversation_keys
CREATE POLICY "Residents can view their habitation keys"
ON public.conversation_keys
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM residents r
    WHERE r.habitation_id = conversation_keys.habitation_id
    AND r.user_id = auth.uid()
    AND r.status = 'verified'
  )
);

CREATE POLICY "Residents can insert keys for their habitation"
ON public.conversation_keys
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM residents r
    WHERE r.habitation_id = conversation_keys.habitation_id
    AND r.user_id = auth.uid()
    AND r.status = 'verified'
  )
);

CREATE POLICY "Residents can update keys for their habitation"
ON public.conversation_keys
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM residents r
    WHERE r.habitation_id = conversation_keys.habitation_id
    AND r.user_id = auth.uid()
    AND r.status = 'verified'
  )
);

CREATE POLICY "Service can manage conversation keys"
ON public.conversation_keys
FOR ALL
USING (true);

-- Add realtime for conversation_keys
ALTER TABLE public.conversation_keys REPLICA IDENTITY FULL;

-- Add updated_at trigger
CREATE TRIGGER update_conversation_keys_updated_at
BEFORE UPDATE ON public.conversation_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();