-- Table pour les cartes de visite des visiteurs
CREATE TABLE public.visitor_business_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_type TEXT NOT NULL DEFAULT 'individual', -- 'individual' ou 'company'
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  job_title TEXT,
  phone TEXT,
  email TEXT,
  visitor_anr_code TEXT,
  device_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '365 days')
);

CREATE INDEX idx_visitor_cards_device ON visitor_business_cards(device_id);

-- Table pour les templates de messages visiteurs
CREATE TABLE public.visitor_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table pour les messages des visiteurs
CREATE TABLE public.visitor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habitation_id UUID NOT NULL REFERENCES habitations(id) ON DELETE CASCADE,
  business_card_id UUID REFERENCES visitor_business_cards(id),
  message TEXT NOT NULL,
  visitor_phone TEXT,
  visitor_latitude NUMERIC,
  visitor_longitude NUMERIC,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_visitor_messages_habitation ON visitor_messages(habitation_id);
CREATE INDEX idx_visitor_messages_created ON visitor_messages(created_at DESC);

-- Enable RLS
ALTER TABLE visitor_business_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_messages ENABLE ROW LEVEL SECURITY;

-- RLS pour visitor_business_cards (accessible par tous pour création/lecture)
CREATE POLICY "Anyone can create business cards"
ON visitor_business_cards FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view business cards"
ON visitor_business_cards FOR SELECT USING (true);

CREATE POLICY "Anyone can update their business card by device_id"
ON visitor_business_cards FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete their business card"
ON visitor_business_cards FOR DELETE USING (true);

-- RLS pour visitor_message_templates
CREATE POLICY "Anyone can view active templates"
ON visitor_message_templates FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can manage templates"
ON visitor_message_templates FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- RLS pour visitor_messages
CREATE POLICY "Anyone can create visitor messages"
ON visitor_messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Residents can view their habitation messages"
ON visitor_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM residents r 
    WHERE r.habitation_id = visitor_messages.habitation_id 
    AND r.user_id = auth.uid() 
    AND r.status = 'verified'
  )
  OR has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Residents can update their habitation messages"
ON visitor_messages FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM residents r 
    WHERE r.habitation_id = visitor_messages.habitation_id 
    AND r.user_id = auth.uid() 
    AND r.status = 'verified'
  )
);

-- Insérer quelques templates par défaut
INSERT INTO visitor_message_templates (name, content, icon, sort_order) VALUES
  ('Livraison', 'Bonjour, je suis le livreur. Votre colis est disponible.', 'Package', 1),
  ('Facteur', 'Bonjour, vous avez un courrier recommandé. Merci de me contacter.', 'Mail', 2),
  ('Visite', 'Bonjour, je souhaite vous rendre visite. Êtes-vous disponible ?', 'Users', 3),
  ('Urgence', 'Bonjour, c''est urgent. Merci de me rappeler dès que possible.', 'AlertCircle', 4);