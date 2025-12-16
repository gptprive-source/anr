-- Allow visitors to update their own messages (for soft delete)
CREATE POLICY "Visitors can update their own messages"
ON visitor_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM visitor_business_cards vbc
    WHERE vbc.id = visitor_messages.business_card_id
    AND vbc.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM visitor_business_cards vbc
    WHERE vbc.id = visitor_messages.business_card_id
    AND vbc.user_id = auth.uid()
  )
);

-- Also allow visitors to update their own replies (for soft delete)
CREATE POLICY "Visitors can update their own replies"
ON message_replies
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM visitor_messages vm
    JOIN visitor_business_cards vbc ON vbc.id = vm.business_card_id
    WHERE vm.id = message_replies.original_message_id
    AND vbc.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM visitor_messages vm
    JOIN visitor_business_cards vbc ON vbc.id = vm.business_card_id
    WHERE vm.id = message_replies.original_message_id
    AND vbc.user_id = auth.uid()
  )
);