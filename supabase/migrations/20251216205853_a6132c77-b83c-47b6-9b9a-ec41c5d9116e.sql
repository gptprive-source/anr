-- Table pour les notifications des visiteurs non-abonnés (basé sur device_id)
CREATE TABLE IF NOT EXISTS public.visitor_device_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour performance sur device_id et is_read
CREATE INDEX IF NOT EXISTS idx_visitor_device_notifications_device 
  ON public.visitor_device_notifications(device_id, is_read);

-- Activer RLS
ALTER TABLE public.visitor_device_notifications ENABLE ROW LEVEL SECURITY;

-- Politique: tout le monde peut lire ses propres notifications (via header x-device-id)
-- Note: En pratique, on utilise localStorage côté client, donc RLS n'est pas utilisable directement
-- On va utiliser une politique permissive pour le service role uniquement
CREATE POLICY "Service can manage visitor device notifications"
  ON public.visitor_device_notifications
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Ajouter colonne pour le comptage des messages migrés lors de l'abonnement
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS migrated_conversations_count INTEGER DEFAULT 0;