-- Fix call_logs INSERT policy - make it permissive
DROP POLICY IF EXISTS "Anyone can create call logs" ON public.call_logs;

CREATE POLICY "Anyone can create call logs" 
ON public.call_logs 
FOR INSERT 
TO public
WITH CHECK (true);