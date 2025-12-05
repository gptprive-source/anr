-- Clean up test user W Z (25a53067-cd6f-44e4-a67c-43e5220012f9) and all related data

-- Set answered_by to NULL in call_logs
UPDATE public.call_logs 
SET answered_by = NULL 
WHERE answered_by = '25a53067-cd6f-44e4-a67c-43e5220012f9';

-- Delete call_participants
DELETE FROM public.call_participants 
WHERE user_id = '25a53067-cd6f-44e4-a67c-43e5220012f9';

-- Delete doming_orders
DELETE FROM public.doming_orders 
WHERE user_id = '25a53067-cd6f-44e4-a67c-43e5220012f9';

-- Delete subscriptions
DELETE FROM public.subscriptions 
WHERE user_id = '25a53067-cd6f-44e4-a67c-43e5220012f9';

-- Delete residents
DELETE FROM public.residents 
WHERE user_id = '25a53067-cd6f-44e4-a67c-43e5220012f9';

-- Delete orphan habitations (no residents)
DELETE FROM public.habitations 
WHERE id NOT IN (SELECT DISTINCT habitation_id FROM public.residents WHERE habitation_id IS NOT NULL);

-- Delete orphan ANRs (no habitations)
DELETE FROM public.anrs 
WHERE id NOT IN (SELECT DISTINCT anr_id FROM public.habitations WHERE anr_id IS NOT NULL);

-- Delete push_tokens
DELETE FROM public.push_tokens 
WHERE user_id = '25a53067-cd6f-44e4-a67c-43e5220012f9';

-- Delete support_conversations
DELETE FROM public.support_conversations 
WHERE user_id = '25a53067-cd6f-44e4-a67c-43e5220012f9';

-- Delete profile
DELETE FROM public.profiles 
WHERE id = '25a53067-cd6f-44e4-a67c-43e5220012f9';

-- Delete from auth.users
DELETE FROM auth.users 
WHERE id = '25a53067-cd6f-44e4-a67c-43e5220012f9';

-- Add stripe_session_id column with UNIQUE constraint for idempotency
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

-- Add unique constraint (if column already exists without constraint)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_stripe_session_id_key'
  ) THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_stripe_session_id_key UNIQUE (stripe_session_id);
  END IF;
END $$;