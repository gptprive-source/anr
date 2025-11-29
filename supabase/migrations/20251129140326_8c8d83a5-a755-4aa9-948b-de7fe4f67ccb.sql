-- Table pour stocker les demandes de vérification de numéro
CREATE TABLE public.phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  verification_code text NOT NULL,
  signature text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  verified_at timestamp with time zone,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired'))
);

-- Index pour recherche rapide
CREATE INDEX idx_phone_verifications_code ON public.phone_verifications(verification_code);
CREATE INDEX idx_phone_verifications_phone ON public.phone_verifications(phone_number);

-- RLS
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

-- Politique: tout le monde peut créer une demande de vérification
CREATE POLICY "Anyone can create verification request"
ON public.phone_verifications FOR INSERT
WITH CHECK (true);

-- Politique: les utilisateurs peuvent voir leurs propres vérifications
CREATE POLICY "Users can view own verifications"
ON public.phone_verifications FOR SELECT
USING (user_id = auth.uid() OR user_id IS NULL);

-- Fonction pour nettoyer les vérifications expirées
CREATE OR REPLACE FUNCTION public.cleanup_expired_verifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.phone_verifications 
  SET status = 'expired' 
  WHERE expires_at < now() AND status = 'pending';
END;
$$;