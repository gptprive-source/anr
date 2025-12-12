-- Create blocked_visitors table
CREATE TABLE public.blocked_visitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  visitor_identifier TEXT NOT NULL,
  visitor_name TEXT,
  reason TEXT,
  blocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, visitor_identifier)
);

-- Enable RLS
ALTER TABLE public.blocked_visitors ENABLE ROW LEVEL SECURITY;

-- Users can only see their own blocked visitors
CREATE POLICY "Users can view their own blocked visitors"
ON public.blocked_visitors FOR SELECT
USING (auth.uid() = user_id);

-- Users can block visitors
CREATE POLICY "Users can block visitors"
ON public.blocked_visitors FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can unblock visitors
CREATE POLICY "Users can unblock visitors"
ON public.blocked_visitors FOR DELETE
USING (auth.uid() = user_id);

-- Admin can view all
CREATE POLICY "Admins can view all blocked visitors"
ON public.blocked_visitors FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);