
-- ============================================
-- PARTIE 0: Ajouter nouvelles catégories valides
-- ============================================

-- Supprimer la contrainte existante et la recréer avec les nouvelles catégories
ALTER TABLE app_config DROP CONSTRAINT IF EXISTS app_config_category_check;
ALTER TABLE app_config ADD CONSTRAINT app_config_category_check 
  CHECK (category IN ('content', 'limits', 'pricing', 'plans', 'features'));

-- ============================================
-- PARTIE 1: Feature Flags dans app_config
-- ============================================

-- Activation des plans
INSERT INTO app_config (key, value, category, description) VALUES
('plan_particulier_enabled', 'true', 'plans', 'Activer l''offre Particuliers'),
('plan_pro_enabled', 'true', 'plans', 'Activer l''offre Pro'),
('plan_entreprise_enabled', 'false', 'plans', 'Activer l''offre Entreprise'),
('plan_collectivites_enabled', 'false', 'plans', 'Activer l''offre Collectivités')
ON CONFLICT (key) DO NOTHING;

-- Activation des fonctionnalités de communication
INSERT INTO app_config (key, value, category, description) VALUES
('feature_voice_calls_enabled', 'true', 'features', 'Activer les appels vocaux'),
('feature_video_calls_enabled', 'true', 'features', 'Activer les appels vidéo'),
('feature_visitor_text_messages_enabled', 'true', 'features', 'Activer les messages texte visiteurs'),
('feature_visitor_voice_messages_enabled', 'true', 'features', 'Activer les messages vocaux visiteurs')
ON CONFLICT (key) DO NOTHING;

-- Activation des fonctionnalités de porte
INSERT INTO app_config (key, value, category, description) VALUES
('feature_door_opening_enabled', 'false', 'features', 'Activer l''ouverture de porte BLE'),
('feature_scheduled_access_enabled', 'false', 'features', 'Activer les autorisations d''accès programmés')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- PARTIE 2: Table message_replies
-- ============================================

CREATE TABLE IF NOT EXISTS public.message_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_message_id UUID NOT NULL,
  resident_id UUID NOT NULL,
  habitation_id UUID NOT NULL,
  reply_text TEXT,
  reply_voice_url TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_message_replies_original ON message_replies(original_message_id);
CREATE INDEX IF NOT EXISTS idx_message_replies_resident ON message_replies(resident_id);

-- RLS
ALTER TABLE message_replies ENABLE ROW LEVEL SECURITY;

-- Résidents peuvent créer/voir leurs réponses
CREATE POLICY "Residents can manage their replies" ON message_replies
  FOR ALL USING (resident_id = auth.uid());

-- Service peut insérer
CREATE POLICY "Service can manage replies" ON message_replies
  FOR ALL USING (true);

-- ============================================
-- PARTIE 3: Table resident_contacts
-- ============================================

CREATE TABLE IF NOT EXISTS public.resident_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contact_type TEXT DEFAULT 'individual',
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  job_title TEXT,
  phone TEXT,
  email TEXT,
  anr_code TEXT,
  notes TEXT,
  source_business_card_id UUID,
  source_message_id UUID,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_resident_contacts_user ON resident_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_resident_contacts_favorite ON resident_contacts(user_id, is_favorite);

-- RLS
ALTER TABLE resident_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their contacts" ON resident_contacts
  FOR ALL USING (user_id = auth.uid());

-- ============================================
-- PARTIE 4: Ajout colonnes visitor_messages
-- ============================================

ALTER TABLE visitor_messages 
ADD COLUMN IF NOT EXISTS has_reply BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS conversation_token TEXT;

-- Index pour le token de conversation
CREATE INDEX IF NOT EXISTS idx_visitor_messages_token ON visitor_messages(conversation_token);

-- Trigger pour mettre à jour has_reply
CREATE OR REPLACE FUNCTION update_message_has_reply()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE visitor_messages 
  SET has_reply = true, replied_at = NEW.created_at
  WHERE id = NEW.original_message_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_message_has_reply ON message_replies;
CREATE TRIGGER trigger_update_message_has_reply
  AFTER INSERT ON message_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_message_has_reply();
