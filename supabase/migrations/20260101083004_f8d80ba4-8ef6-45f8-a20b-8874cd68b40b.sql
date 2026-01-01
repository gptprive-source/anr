-- Ajouter target_user_id à call_logs pour les appels privés
ALTER TABLE public.call_logs
ADD COLUMN target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Ajouter recipient_user_id à visitor_messages pour les messages privés
ALTER TABLE public.visitor_messages
ADD COLUMN recipient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index pour améliorer les performances des requêtes filtrées
CREATE INDEX idx_call_logs_target_user_id ON public.call_logs(target_user_id) WHERE target_user_id IS NOT NULL;
CREATE INDEX idx_visitor_messages_recipient_user_id ON public.visitor_messages(recipient_user_id) WHERE recipient_user_id IS NOT NULL;

-- Commentaires pour documentation
COMMENT ON COLUMN public.call_logs.target_user_id IS 'Si NULL, appel à toute la résidence. Si défini, appel privé pour ce résident uniquement.';
COMMENT ON COLUMN public.visitor_messages.recipient_user_id IS 'Si NULL, message visible par toute la résidence. Si défini, message privé pour ce résident uniquement.';

-- Mettre à jour la politique RLS pour visitor_messages pour filtrer les messages privés
DROP POLICY IF EXISTS "Residents can view messages for their habitation" ON public.visitor_messages;

CREATE POLICY "Residents can view messages for their habitation" 
ON public.visitor_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM residents r
    WHERE r.habitation_id = visitor_messages.habitation_id 
      AND r.user_id = auth.uid() 
      AND r.status = 'verified'
      AND (
        visitor_messages.recipient_user_id IS NULL 
        OR visitor_messages.recipient_user_id = auth.uid()
      )
  )
);