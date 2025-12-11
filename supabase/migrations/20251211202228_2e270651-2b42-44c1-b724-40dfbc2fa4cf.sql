-- Add plan_type column to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'particulier';

-- Update existing subscriptions (we'll need to sync with Stripe to get accurate values)
COMMENT ON COLUMN public.subscriptions.plan_type IS 'The plan type: particulier, pro, entreprise, collectivites';