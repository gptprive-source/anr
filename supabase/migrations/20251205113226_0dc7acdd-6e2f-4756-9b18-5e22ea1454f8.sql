-- Clean up test user: Abdelkader Amini (049c5b04-b37e-4b94-9ac0-b389829c9792)

-- First, set call_logs.answered_by to NULL where it references this user
UPDATE public.call_logs 
SET answered_by = NULL 
WHERE answered_by = '049c5b04-b37e-4b94-9ac0-b389829c9792';

-- Delete call_participants
DELETE FROM public.call_participants 
WHERE user_id = '049c5b04-b37e-4b94-9ac0-b389829c9792';

-- Delete doming_orders
DELETE FROM public.doming_orders 
WHERE user_id = '049c5b04-b37e-4b94-9ac0-b389829c9792';

-- Delete subscriptions
DELETE FROM public.subscriptions 
WHERE user_id = '049c5b04-b37e-4b94-9ac0-b389829c9792';

-- Delete residents
DELETE FROM public.residents 
WHERE user_id = '049c5b04-b37e-4b94-9ac0-b389829c9792';

-- Delete push_tokens
DELETE FROM public.push_tokens 
WHERE user_id = '049c5b04-b37e-4b94-9ac0-b389829c9792';

-- Delete support_conversations
DELETE FROM public.support_conversations 
WHERE user_id = '049c5b04-b37e-4b94-9ac0-b389829c9792';

-- Delete profile (will be cascade deleted with auth.users, but explicit for safety)
DELETE FROM public.profiles 
WHERE id = '049c5b04-b37e-4b94-9ac0-b389829c9792';

-- Delete from auth.users (this will cascade delete the profile)
DELETE FROM auth.users 
WHERE id = '049c5b04-b37e-4b94-9ac0-b389829c9792';