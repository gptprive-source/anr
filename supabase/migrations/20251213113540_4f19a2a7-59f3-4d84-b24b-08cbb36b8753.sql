
-- Create admin communications table
CREATE TABLE public.admin_communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  target_type TEXT NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'specific')),
  target_user_ids UUID[] DEFAULT '{}',
  allow_reply BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user read status for communications
CREATE TABLE public.user_communication_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  communication_id UUID NOT NULL REFERENCES public.admin_communications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(communication_id, user_id)
);

-- Create user replies to communications
CREATE TABLE public.communication_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  communication_id UUID NOT NULL REFERENCES public.admin_communications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reply_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_communication_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_replies ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin_communications
CREATE POLICY "Admins can manage communications"
ON public.admin_communications FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view their targeted communications"
ON public.admin_communications FOR SELECT
USING (
  is_active = true AND (
    target_type = 'all' OR 
    auth.uid() = ANY(target_user_ids)
  )
);

-- RLS policies for user_communication_reads
CREATE POLICY "Users can manage their own read status"
ON public.user_communication_reads FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all read statuses"
ON public.user_communication_reads FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- RLS policies for communication_replies
CREATE POLICY "Users can create their own replies"
ON public.communication_replies FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own replies"
ON public.communication_replies FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all replies"
ON public.communication_replies FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Add indexes
CREATE INDEX idx_admin_communications_target_type ON public.admin_communications(target_type);
CREATE INDEX idx_admin_communications_sent_at ON public.admin_communications(sent_at DESC);
CREATE INDEX idx_user_communication_reads_user ON public.user_communication_reads(user_id);
CREATE INDEX idx_communication_replies_communication ON public.communication_replies(communication_id);
