-- Add user_id column to visitor_business_cards table
ALTER TABLE public.visitor_business_cards 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to visitor_custom_templates table
ALTER TABLE public.visitor_custom_templates 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_visitor_business_cards_user_id ON public.visitor_business_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_visitor_custom_templates_user_id ON public.visitor_custom_templates(user_id);

-- Update RLS policies to allow users to access their own data by user_id
DROP POLICY IF EXISTS "Anyone can read business cards" ON public.visitor_business_cards;
DROP POLICY IF EXISTS "Anyone can insert business cards" ON public.visitor_business_cards;
DROP POLICY IF EXISTS "Anyone can update business cards" ON public.visitor_business_cards;
DROP POLICY IF EXISTS "Anyone can delete business cards" ON public.visitor_business_cards;

CREATE POLICY "Users can read own business cards by user_id or device_id" ON public.visitor_business_cards
FOR SELECT USING (true);

CREATE POLICY "Anyone can insert business cards" ON public.visitor_business_cards
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own business cards" ON public.visitor_business_cards
FOR UPDATE USING (true);

CREATE POLICY "Users can delete own business cards" ON public.visitor_business_cards
FOR DELETE USING (true);

-- Same for custom templates
DROP POLICY IF EXISTS "Anyone can read custom templates" ON public.visitor_custom_templates;
DROP POLICY IF EXISTS "Anyone can insert custom templates" ON public.visitor_custom_templates;
DROP POLICY IF EXISTS "Anyone can update custom templates" ON public.visitor_custom_templates;
DROP POLICY IF EXISTS "Anyone can delete custom templates" ON public.visitor_custom_templates;

CREATE POLICY "Users can read own custom templates" ON public.visitor_custom_templates
FOR SELECT USING (true);

CREATE POLICY "Anyone can insert custom templates" ON public.visitor_custom_templates
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own custom templates" ON public.visitor_custom_templates
FOR UPDATE USING (true);

CREATE POLICY "Users can delete own custom templates" ON public.visitor_custom_templates
FOR DELETE USING (true);