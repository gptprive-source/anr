-- Delete user aminikhalid@gmail.com and all related data
-- First delete from dependent tables
DELETE FROM public.residents WHERE user_id = '86f63637-d474-4942-8269-781e5d12c825';
DELETE FROM public.profiles WHERE id = '86f63637-d474-4942-8269-781e5d12c825';
DELETE FROM public.user_roles WHERE user_id = '86f63637-d474-4942-8269-781e5d12c825';
DELETE FROM public.visitor_business_cards WHERE user_id = '86f63637-d474-4942-8269-781e5d12c825';

-- Delete from auth.users (this will cascade to other auth tables)
DELETE FROM auth.users WHERE id = '86f63637-d474-4942-8269-781e5d12c825';