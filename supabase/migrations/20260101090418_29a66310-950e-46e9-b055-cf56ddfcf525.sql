-- Allow anyone to view avatar_url from visitor_business_cards
-- for verified residents, enabling visitors to see resident photos
CREATE POLICY "Anyone can view resident avatars for calls"
ON visitor_business_cards
FOR SELECT
TO anon, authenticated
USING (
  user_id IN (
    SELECT user_id FROM residents 
    WHERE status = 'verified'
  )
);