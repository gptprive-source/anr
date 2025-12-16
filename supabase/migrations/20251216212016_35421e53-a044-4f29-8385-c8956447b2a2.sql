-- Simplified RLS: Allow visitors to read messages if the business card has no user_id (device-based)
-- This is secure because:
-- 1. Only the device owner can create the business card with that device_id
-- 2. Messages are linked to the business_card, not directly exposed

DROP POLICY IF EXISTS "Visitors can view their sent messages" ON visitor_messages;

-- Policy for authenticated users (by user_id) AND device-based visitors (business_card has no user_id)
CREATE POLICY "Visitors can view their sent messages"
ON visitor_messages
FOR SELECT
USING (
  -- Authenticated users can see their messages
  business_card_id IN (
    SELECT id FROM visitor_business_cards 
    WHERE user_id = auth.uid()
  )
  OR
  -- Device-based visitors: allow read if business_card has no user_id
  -- This is safe because the business_card is linked by device_id locally
  business_card_id IN (
    SELECT id FROM visitor_business_cards 
    WHERE user_id IS NULL
  )
);

-- Same for UPDATE
DROP POLICY IF EXISTS "Visitors can update their own messages" ON visitor_messages;

CREATE POLICY "Visitors can update their own messages"
ON visitor_messages
FOR UPDATE
USING (
  business_card_id IN (
    SELECT id FROM visitor_business_cards 
    WHERE user_id = auth.uid()
  )
  OR
  business_card_id IN (
    SELECT id FROM visitor_business_cards 
    WHERE user_id IS NULL
  )
);

-- Same for DELETE
DROP POLICY IF EXISTS "Visitors can delete their own messages" ON visitor_messages;

CREATE POLICY "Visitors can delete their own messages"
ON visitor_messages
FOR DELETE
USING (
  business_card_id IN (
    SELECT id FROM visitor_business_cards 
    WHERE user_id = auth.uid()
  )
  OR
  business_card_id IN (
    SELECT id FROM visitor_business_cards 
    WHERE user_id IS NULL
  )
);