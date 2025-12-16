-- Add RLS policy for visitors to read their messages by device_id (non-authenticated)
-- This allows visitors who aren't logged in to see their messages

CREATE OR REPLACE FUNCTION public.get_visitor_device_id()
RETURNS TEXT AS $$
BEGIN
  -- Get device_id from request header (set by client)
  RETURN current_setting('request.headers', true)::json->>'x-device-id';
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the existing restrictive policy and create a more permissive one
DROP POLICY IF EXISTS "Visitors can view their sent messages" ON visitor_messages;

-- Create new policy that allows access by user_id OR device_id
CREATE POLICY "Visitors can view their sent messages"
ON visitor_messages
FOR SELECT
USING (
  business_card_id IN (
    SELECT id FROM visitor_business_cards 
    WHERE user_id = auth.uid() 
    OR device_id = public.get_visitor_device_id()
  )
);

-- Also update the UPDATE policy for soft delete
DROP POLICY IF EXISTS "Visitors can update their own messages" ON visitor_messages;

CREATE POLICY "Visitors can update their own messages"
ON visitor_messages
FOR UPDATE
USING (
  business_card_id IN (
    SELECT id FROM visitor_business_cards 
    WHERE user_id = auth.uid() 
    OR device_id = public.get_visitor_device_id()
  )
);

-- Also update DELETE policy
DROP POLICY IF EXISTS "Visitors can delete their own messages" ON visitor_messages;

CREATE POLICY "Visitors can delete their own messages"
ON visitor_messages
FOR DELETE
USING (
  business_card_id IN (
    SELECT id FROM visitor_business_cards 
    WHERE user_id = auth.uid() 
    OR device_id = public.get_visitor_device_id()
  )
);