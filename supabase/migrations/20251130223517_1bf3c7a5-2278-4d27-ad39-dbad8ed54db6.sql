-- Drop all existing call_logs policies and recreate them as permissive
DROP POLICY IF EXISTS "Anyone can create call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Residents can update call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Residents can view call logs" ON public.call_logs;

-- Recreate as permissive policies
CREATE POLICY "Anyone can create call logs" 
ON public.call_logs 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can view call logs" 
ON public.call_logs 
FOR SELECT 
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can update call logs" 
ON public.call_logs 
FOR UPDATE 
TO anon, authenticated
USING (true);

-- Also fix call_participants policies
DROP POLICY IF EXISTS "Anyone can create call participants" ON public.call_participants;
DROP POLICY IF EXISTS "Anyone can delete call participants" ON public.call_participants;
DROP POLICY IF EXISTS "Participants can update their own status" ON public.call_participants;
DROP POLICY IF EXISTS "Participants can view call participants" ON public.call_participants;

CREATE POLICY "Anyone can create call participants" 
ON public.call_participants 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can view call participants" 
ON public.call_participants 
FOR SELECT 
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can update call participants" 
ON public.call_participants 
FOR UPDATE 
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can delete call participants" 
ON public.call_participants 
FOR DELETE 
TO anon, authenticated
USING (true);