-- Permettre aux résidents de supprimer les messages de leur habitation
CREATE POLICY "Residents can delete their habitation messages"
ON visitor_messages FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM residents r 
    WHERE r.habitation_id = visitor_messages.habitation_id 
    AND r.user_id = auth.uid() 
    AND r.status = 'verified'
  )
);

-- Permettre aux visiteurs de supprimer leurs propres messages (via business_card_id)
CREATE POLICY "Visitors can delete their own messages"
ON visitor_messages FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM visitor_business_cards vbc 
    WHERE vbc.id = visitor_messages.business_card_id 
    AND vbc.user_id = auth.uid()
  )
);

-- Permettre aux résidents de supprimer leurs réponses
CREATE POLICY "Residents can delete their own replies"
ON message_replies FOR DELETE USING (
  resident_id = auth.uid()
);