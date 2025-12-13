-- Politique: Visiteurs connectés peuvent lire leurs messages envoyés
CREATE POLICY "Visitors can view their sent messages" 
ON visitor_messages FOR SELECT 
USING (
  business_card_id IN (
    SELECT id FROM visitor_business_cards WHERE user_id = auth.uid()
  )
);

-- Politique: Visiteurs connectés peuvent lire les réponses à leurs messages
CREATE POLICY "Visitors can view replies to their messages"
ON message_replies FOR SELECT
USING (
  original_message_id IN (
    SELECT vm.id FROM visitor_messages vm
    JOIN visitor_business_cards vbc ON vm.business_card_id = vbc.id
    WHERE vbc.user_id = auth.uid()
  )
);