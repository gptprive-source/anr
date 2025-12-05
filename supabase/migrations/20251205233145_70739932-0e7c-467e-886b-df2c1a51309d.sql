-- Table pour le registre des traitements (Article 30 RGPD)
CREATE TABLE public.rgpd_data_processing_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  purpose text NOT NULL,
  legal_basis text NOT NULL CHECK (legal_basis IN ('contract', 'consent', 'legitimate_interest', 'legal_obligation')),
  data_categories text[] NOT NULL,
  retention_period text NOT NULL,
  recipients text[] NOT NULL,
  third_country_transfer boolean DEFAULT false,
  transfer_safeguards text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Table pour les sous-traitants
CREATE TABLE public.rgpd_subprocessors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  service_description text NOT NULL,
  location text NOT NULL,
  is_eu boolean DEFAULT false,
  dpa_url text,
  dpa_signed_date date,
  transfer_safeguards text,
  data_processed text[],
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table pour les demandes d'exercice de droits
CREATE TABLE public.rgpd_rights_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('access', 'rectification', 'deletion', 'portability', 'opposition')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  request_details text,
  response_details text,
  handled_by uuid REFERENCES auth.users(id),
  requested_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  deadline_at timestamptz DEFAULT (now() + interval '30 days')
);

-- Table pour l'historique des consentements
CREATE TABLE public.user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type text NOT NULL CHECK (consent_type IN ('cgu', 'privacy_policy', 'tacit_renewal', 'ai_chatbot', 'geolocation')),
  version text NOT NULL,
  consented boolean NOT NULL,
  consented_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text
);

-- Table pour les incidents de données
CREATE TABLE public.rgpd_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_date timestamptz NOT NULL,
  discovered_date timestamptz NOT NULL,
  description text NOT NULL,
  data_affected text[],
  users_affected_count integer,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  cnil_notified boolean DEFAULT false,
  cnil_notification_date timestamptz,
  users_notified boolean DEFAULT false,
  users_notification_date timestamptz,
  containment_actions text,
  remediation_actions text,
  lessons_learned text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'contained', 'resolved', 'closed')),
  reported_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table pour les logs de purge automatique
CREATE TABLE public.rgpd_purge_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purge_type text NOT NULL,
  records_deleted integer DEFAULT 0,
  records_anonymized integer DEFAULT 0,
  executed_at timestamptz DEFAULT now(),
  details jsonb
);

-- Enable RLS on all tables
ALTER TABLE public.rgpd_data_processing_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rgpd_subprocessors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rgpd_rights_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rgpd_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rgpd_purge_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rgpd_data_processing_registry
CREATE POLICY "Admins can manage registry" ON public.rgpd_data_processing_registry
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Analysts can view registry" ON public.rgpd_data_processing_registry
  FOR SELECT USING (has_role(auth.uid(), 'analyst'));

-- RLS Policies for rgpd_subprocessors
CREATE POLICY "Admins can manage subprocessors" ON public.rgpd_subprocessors
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Analysts can view subprocessors" ON public.rgpd_subprocessors
  FOR SELECT USING (has_role(auth.uid(), 'analyst'));

-- RLS Policies for rgpd_rights_requests
CREATE POLICY "Admins can manage rights requests" ON public.rgpd_rights_requests
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view own requests" ON public.rgpd_rights_requests
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own requests" ON public.rgpd_rights_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for user_consents
CREATE POLICY "Admins can view all consents" ON public.user_consents
  FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view own consents" ON public.user_consents
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own consents" ON public.user_consents
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service can insert consents" ON public.user_consents
  FOR INSERT WITH CHECK (true);

-- RLS Policies for rgpd_incidents
CREATE POLICY "Admins can manage incidents" ON public.rgpd_incidents
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- RLS Policies for rgpd_purge_logs
CREATE POLICY "Admins can view purge logs" ON public.rgpd_purge_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Service can insert purge logs" ON public.rgpd_purge_logs
  FOR INSERT WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_rgpd_registry_updated_at BEFORE UPDATE ON public.rgpd_data_processing_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rgpd_subprocessors_updated_at BEFORE UPDATE ON public.rgpd_subprocessors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rgpd_incidents_updated_at BEFORE UPDATE ON public.rgpd_incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default data processing registry entries
INSERT INTO public.rgpd_data_processing_registry (name, purpose, legal_basis, data_categories, retention_period, recipients, third_country_transfer, transfer_safeguards) VALUES
('Authentification', 'Gestion des comptes utilisateurs et authentification', 'contract', ARRAY['email', 'mot_de_passe_hashé', 'nom', 'prénom'], 'Durée du compte + 3 ans', ARRAY['Supabase'], true, 'Standard Contractual Clauses (SCCs)'),
('Interphone numérique', 'Service principal de visioconférence interphone', 'contract', ARRAY['nom', 'prénom', 'adresse_postale', 'coordonnées_GPS', 'logs_appels'], 'Durée abonnement + 1 an', ARRAY['Daily.co', 'Supabase'], true, 'Standard Contractual Clauses (SCCs)'),
('Paiement', 'Gestion des abonnements et facturation', 'contract', ARRAY['nom', 'email', 'données_carte_bancaire'], '10 ans (obligation légale)', ARRAY['Stripe'], true, 'Standard Contractual Clauses (SCCs)'),
('Géolocalisation visiteur', 'Vérification de proximité anti-fraude', 'legitimate_interest', ARRAY['latitude', 'longitude'], '30 jours', ARRAY['Supabase'], true, 'Standard Contractual Clauses (SCCs)'),
('Support chatbot', 'Assistance utilisateur via IA', 'consent', ARRAY['questions', 'réponses'], '6 mois', ARRAY['OpenAI'], true, 'Standard Contractual Clauses (SCCs)'),
('Notifications push', 'Alertes appels entrants', 'consent', ARRAY['token_appareil'], 'Durée du compte', ARRAY['Firebase Cloud Messaging'], true, 'Standard Contractual Clauses (SCCs)'),
('Contact', 'Gestion relation client', 'consent', ARRAY['nom', 'email', 'téléphone', 'message'], '3 ans', ARRAY['Hostinger SMTP'], false, NULL),
('Audit administrateur', 'Traçabilité des actions admin', 'legitimate_interest', ARRAY['actions_admin', 'horodatage', 'user_agent'], '5 ans', ARRAY['Supabase'], true, 'Standard Contractual Clauses (SCCs)');

-- Insert default subprocessors
INSERT INTO public.rgpd_subprocessors (name, service_description, location, is_eu, dpa_url, transfer_safeguards, data_processed) VALUES
('Supabase Inc.', 'Base de données PostgreSQL, authentification, stockage fichiers, Edge Functions', 'USA (région eu-central-1 disponible)', false, 'https://supabase.com/docs/company/privacy', 'Standard Contractual Clauses (SCCs)', ARRAY['profils', 'authentification', 'logs', 'fichiers']),
('Stripe Inc.', 'Traitement des paiements et gestion des abonnements', 'USA', false, 'https://stripe.com/fr/privacy', 'Standard Contractual Clauses (SCCs)', ARRAY['nom', 'email', 'données_bancaires']),
('Daily.co', 'Infrastructure WebRTC pour visioconférence', 'USA', false, 'https://www.daily.co/legal/privacy-policy', 'Standard Contractual Clauses (SCCs)', ARRAY['flux_vidéo', 'flux_audio']),
('OpenAI', 'Modèle IA pour chatbot support (opt-in)', 'USA', false, 'https://openai.com/policies/privacy-policy', 'Standard Contractual Clauses (SCCs) + API DPA', ARRAY['questions_support']),
('Hostinger', 'Envoi emails transactionnels via SMTP', 'Lituanie (UE)', true, 'https://www.hostinger.fr/politique-de-confidentialite', 'Hébergement UE - Pas de transfert', ARRAY['emails', 'nom_destinataire']),
('Google Firebase', 'Push notifications (FCM)', 'USA', false, 'https://firebase.google.com/support/privacy', 'Standard Contractual Clauses (SCCs)', ARRAY['token_appareil']);