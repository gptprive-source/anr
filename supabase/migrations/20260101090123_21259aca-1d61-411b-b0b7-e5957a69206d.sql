-- Allow anyone to view basic profile info (first_name, last_name, avatar_url) 
-- for verified residents of any habitation
-- This enables visitors to see who they can call
CREATE POLICY "Anyone can view resident names for calls"
ON profiles
FOR SELECT
TO anon, authenticated
USING (
  id IN (
    SELECT user_id FROM residents 
    WHERE status = 'verified'
  )
);