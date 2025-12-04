-- App configuration table (editable system parameters)
CREATE TABLE public.app_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('pricing', 'limits', 'features', 'content')),
  updated_by uuid REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Dynamic FAQ items (editable from admin)
CREATE TABLE public.faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL,
  section_icon TEXT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Admin audit logs (all admin actions)
CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for app_config
CREATE POLICY "Anyone can read config" ON public.app_config
FOR SELECT USING (true);

CREATE POLICY "Admins can update config" ON public.app_config
FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert config" ON public.app_config
FOR INSERT WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete config" ON public.app_config
FOR DELETE USING (has_role(auth.uid(), 'super_admin'));

-- RLS Policies for faq_items
CREATE POLICY "Anyone can read active FAQ" ON public.faq_items
FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can insert FAQ" ON public.faq_items
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update FAQ" ON public.faq_items
FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete FAQ" ON public.faq_items
FOR DELETE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- RLS Policies for admin_audit_logs
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs
FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'analyst'));

CREATE POLICY "System can insert audit logs" ON public.admin_audit_logs
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Insert default configuration values
INSERT INTO public.app_config (key, value, description, category) VALUES
('subscription_price', '12', 'Prix abonnement annuel en euros', 'pricing'),
('doming_price', '7', 'Prix unitaire d''un Doming en euros', 'pricing'),
('free_doming_for_new_anr', 'true', 'Doming gratuit pour nouvelle ANR', 'pricing'),
('max_call_duration_seconds', '120', 'Durée maximale d''un appel en secondes', 'limits'),
('max_distance_meters', '30', 'Distance maximale du visiteur en mètres', 'limits'),
('max_residents_per_habitation', '7', 'Nombre maximum de résidents par habitation', 'limits'),
('invitation_validity_hours', '24', 'Durée de validité d''une invitation en heures', 'limits'),
('app_name', '"ANR"', 'Nom de l''application', 'content'),
('support_email', '"contact@soqotomobil.com"', 'Email de support', 'content');

-- Insert default FAQ items from existing FAQ
INSERT INTO public.faq_items (section, section_icon, question, answer, sort_order) VALUES
('L''APPLICATION ANR', 'Smartphone', 'Qu''est-ce que l''ANR ?', 'L''ANR (Adresse Numérique Résidentielle) est un identifiant unique et gratuit attribué à chaque adresse postale en France. Il se compose d''un QR code, d''une puce NFC et d''un numéro d''identification, tous matérialisés sur un Doming à coller sur votre boîte à lettres ou portail.', 1),
('L''APPLICATION ANR', 'Smartphone', 'Qu''est-ce que l''interphone numérique ?', 'L''interphone numérique est un service d''abonnement (12€/an) qui permet aux visiteurs de vous appeler via l''ANR de votre habitation. Quand un visiteur scanne votre ANR, vous recevez un appel vidéo sur votre téléphone, où que vous soyez.', 2),
('L''APPLICATION ANR', 'Smartphone', 'Quelle est la différence entre ANR et interphone ?', 'L''ANR est l''identifiant gratuit de votre adresse (comme un numéro de téléphone pour votre maison). L''interphone numérique est le service payant qui vous permet de recevoir les appels des visiteurs. L''ANR existe indépendamment de tout abonnement.', 3),
('L''APPLICATION ANR', 'Smartphone', 'Comment ça fonctionne pour le visiteur ?', 'Le visiteur scanne le QR code, la puce NFC ou saisit le numéro ANR. Il voit s''afficher l''adresse et peut lancer un appel vidéo. Vous recevez l''appel sur votre téléphone et pouvez voir le visiteur avant de décrocher.', 4),
('ABONNEMENT & PAIEMENT', 'CreditCard', 'Combien coûte l''abonnement ?', 'L''abonnement à l''interphone numérique coûte 12€ par an avec reconduction tacite. Vous pouvez résilier à tout moment depuis votre espace client.', 1),
('ABONNEMENT & PAIEMENT', 'CreditCard', 'Qu''est-ce que le Doming ?', 'Le Doming est le badge physique contenant votre QR code, puce NFC et numéro ANR. Un Doming gratuit est inclus lors de la création d''une nouvelle ANR. Les Domings supplémentaires coûtent 7€ pièce.', 2),
('ABONNEMENT & PAIEMENT', 'CreditCard', 'Mon abonnement est-il lié à mon adresse ?', 'Non, votre abonnement est lié à votre compte utilisateur, pas à l''adresse. Si vous déménagez, votre abonnement vous suit. Si vous supprimez votre compte et le recréez avec le même email, nom et prénom, l''abonnement en cours est automatiquement réattaché.', 3),
('RÉSIDENTS & INVITÉS', 'Users', 'Combien de résidents peuvent partager une ANR ?', 'Jusqu''à 7 résidents peuvent être liés à une même habitation : 1 résident principal (propriétaire du compte) et jusqu''à 6 résidents invités.', 1),
('RÉSIDENTS & INVITÉS', 'Users', 'Comment inviter un autre résident ?', 'Depuis votre tableau de bord, cliquez sur "Inviter un résident". Entrez son email, prénom et nom. Il recevra un lien d''invitation valable 24 heures pour créer son compte et rejoindre votre habitation.', 2),
('DÉMÉNAGEMENT', 'Home', 'Que se passe-t-il si je déménage ?', 'Votre ANR reste attachée à votre ancienne adresse (elle appartient au lieu, pas à vous). Modifiez votre adresse dans votre compte, puis scannez l''ANR de votre nouvelle habitation. Si elle n''a pas de Doming, un nouveau vous sera envoyé gratuitement.', 1),
('DÉMÉNAGEMENT', 'Home', 'Puis-je supprimer mon ANR ?', 'Non, les ANR sont permanentes et indestructibles. Elles représentent l''adresse de façon perpétuelle. Même si vous supprimez votre compte, l''ANR restera associée à cette adresse pour de futurs occupants.', 2),
('SÉCURITÉ', 'Shield', 'Comment fonctionne la vérification de distance ?', 'Pour éviter les appels frauduleux, le visiteur doit se trouver à moins de 30 mètres de la position GPS de l''ANR. Au-delà, l''interphone ne fonctionne pas.', 1),
('SÉCURITÉ', 'Shield', 'Puis-je voir le visiteur avant de répondre ?', 'Oui ! La fonction "œil de bœuf" vous permet de voir le visiteur en vidéo avant de décrocher. Vous restez invisible jusqu''à ce que vous acceptiez l''appel.', 2),
('SÉCURITÉ', 'Shield', 'Quelle est la durée maximale d''un appel ?', 'Les appels sont limités à 2 minutes maximum pour garantir une utilisation raisonnable du service.', 3);

-- Create triggers for updated_at
CREATE TRIGGER update_app_config_updated_at
BEFORE UPDATE ON public.app_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_faq_items_updated_at
BEFORE UPDATE ON public.faq_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();