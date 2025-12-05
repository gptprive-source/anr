-- Create table to track chatbot usage and costs
CREATE TABLE public.chatbot_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  conversation_id uuid REFERENCES public.support_conversations(id),
  source text NOT NULL, -- 'faq' or 'openai'
  model text, -- 'gpt-4o-mini' etc for openai
  input_tokens integer DEFAULT 0,
  output_tokens integer DEFAULT 0,
  estimated_cost numeric(10,6) DEFAULT 0, -- in USD
  query_text text,
  response_preview text -- first 100 chars of response
);

-- Enable RLS
ALTER TABLE public.chatbot_usage ENABLE ROW LEVEL SECURITY;

-- Admins can view all usage
CREATE POLICY "Admins can view chatbot usage"
ON public.chatbot_usage
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'analyst'::app_role)
);

-- Service role can insert usage records
CREATE POLICY "Service can insert chatbot usage"
ON public.chatbot_usage
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_chatbot_usage_created_at ON public.chatbot_usage(created_at DESC);
CREATE INDEX idx_chatbot_usage_source ON public.chatbot_usage(source);