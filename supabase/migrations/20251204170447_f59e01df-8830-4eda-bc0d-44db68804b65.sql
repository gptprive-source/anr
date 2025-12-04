-- Support conversations table
CREATE TABLE public.support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'pending')),
  assigned_to uuid REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Support messages table
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.support_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'bot', 'agent')),
  sender_id uuid REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Policies for support_conversations
CREATE POLICY "Users can view own conversations" ON public.support_conversations
FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can create conversations" ON public.support_conversations
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update conversations" ON public.support_conversations
FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR user_id = auth.uid());

-- Policies for support_messages
CREATE POLICY "Users can view messages in their conversations" ON public.support_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.support_conversations sc 
    WHERE sc.id = conversation_id 
    AND (sc.user_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'))
  )
);

CREATE POLICY "Users can send messages" ON public.support_messages
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.support_conversations sc 
    WHERE sc.id = conversation_id 
    AND (sc.user_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'))
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_support_conversations_updated_at
BEFORE UPDATE ON public.support_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();