-- Add RLS policy to allow visitors (including anonymous) to view replies to their messages
-- This allows viewing via visitor_device_id stored in the original visitor_message

-- Policy for anonymous visitors to view replies to their messages via device_id
CREATE POLICY "Visitors can view replies to their messages via device_id"
ON public.message_replies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM visitor_messages vm
    WHERE vm.id = message_replies.original_message_id
    AND vm.visitor_device_id IS NOT NULL
  )
);

-- Policy for authenticated visitors to view replies via their business_card
CREATE POLICY "Authenticated visitors can view replies via business_card"
ON public.message_replies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM visitor_messages vm
    JOIN visitor_business_cards vbc ON vbc.id = vm.business_card_id
    WHERE vm.id = message_replies.original_message_id
    AND vbc.user_id = auth.uid()
  )
);