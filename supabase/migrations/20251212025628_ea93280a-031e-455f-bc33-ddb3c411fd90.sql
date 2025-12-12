-- Delete user Hassane AMINI (enseignes.prod@gmail.com) - ID: a936a2bc-0f88-4028-8f0d-f63c0d539c4a

-- First, clear any foreign key references
UPDATE public.call_logs SET answered_by = NULL WHERE answered_by = 'a936a2bc-0f88-4028-8f0d-f63c0d539c4a';

-- Delete from all related tables
DELETE FROM public.push_tokens WHERE user_id = 'a936a2bc-0f88-4028-8f0d-f63c0d539c4a';
DELETE FROM public.call_participants WHERE user_id = 'a936a2bc-0f88-4028-8f0d-f63c0d539c4a';
DELETE FROM public.residents WHERE user_id = 'a936a2bc-0f88-4028-8f0d-f63c0d539c4a';
DELETE FROM public.subscriptions WHERE user_id = 'a936a2bc-0f88-4028-8f0d-f63c0d539c4a';
DELETE FROM public.doming_orders WHERE user_id = 'a936a2bc-0f88-4028-8f0d-f63c0d539c4a';
DELETE FROM public.resident_invitations WHERE invited_by = 'a936a2bc-0f88-4028-8f0d-f63c0d539c4a';
DELETE FROM public.blocked_visitors WHERE user_id = 'a936a2bc-0f88-4028-8f0d-f63c0d539c4a';
DELETE FROM public.resident_contacts WHERE user_id = 'a936a2bc-0f88-4028-8f0d-f63c0d539c4a';
DELETE FROM public.referral_codes WHERE user_id = 'a936a2bc-0f88-4028-8f0d-f63c0d539c4a';
DELETE FROM public.referrals WHERE referrer_id = 'a936a2bc-0f88-4028-8f0d-f63c0d539c4a' OR referred_id = 'a936a2bc-0f88-4028-8f0d-f63c0d539c4a';
DELETE FROM public.face_embeddings WHERE user_id = 'a936a2bc-0f88-4028-8f0d-f63c0d539c4a';
DELETE FROM public.google_drive_tokens WHERE user_id = 'a936a2bc-0f88-4028-8f0d-f63c0d539c4a';
DELETE FROM public.copilot_sessions WHERE user_id = 'a936a2bc-0f88-4028-8f0d-f63c0d539c4a';
DELETE FROM public.copilot_usage WHERE user_id = 'a936a2bc-0f88-4028-8f0d-f63c0d539c4a';
DELETE FROM public.rgpd_rights_requests WHERE user_id = 'a936a2bc-0f88-4028-8f0d-f63c0d539c4a';
DELETE FROM public.support_conversations WHERE user_id = 'a936a2bc-0f88-4028-8f0d-f63c0d539c4a';

-- Delete profile (will cascade from auth.users but doing explicitly first)
DELETE FROM public.profiles WHERE id = 'a936a2bc-0f88-4028-8f0d-f63c0d539c4a';

-- Finally delete from auth.users (this should cascade to profiles if not already deleted)
DELETE FROM auth.users WHERE id = 'a936a2bc-0f88-4028-8f0d-f63c0d539c4a';