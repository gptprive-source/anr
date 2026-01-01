-- Drop the old restrictive UPDATE policies
DROP POLICY IF EXISTS "Recipients can mark messages as read" ON public.messages;
DROP POLICY IF EXISTS "Senders can soft delete their messages" ON public.messages;