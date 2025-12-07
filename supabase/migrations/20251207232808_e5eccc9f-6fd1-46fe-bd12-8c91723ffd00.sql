-- =============================================
-- SYSTÈME D'OUVERTURE DE PORTE ANR + CO-PILOT
-- =============================================

-- Ajout colonne consentement services de secours (opt-in, désactivé par défaut)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS allow_emergency_access BOOLEAN DEFAULT false;

-- =============================================
-- MODULES DE PORTE (ESP32)
-- =============================================
CREATE TABLE IF NOT EXISTS door_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anr_id UUID REFERENCES anrs(id) NOT NULL,
  device_id TEXT UNIQUE NOT NULL,
  secret_key TEXT NOT NULL,
  module_type TEXT DEFAULT 'entry' CHECK (module_type IN ('entry', 'exit', 'both')),
  firmware_version TEXT,
  rssi_threshold INTEGER DEFAULT -75,
  relay_duration_ms INTEGER DEFAULT 1000,
  last_sync_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- SESSIONS D'ACCÈS (logique 1er scan ENTRÉE / 2ème scan SORTIE)
-- =============================================
CREATE TABLE IF NOT EXISTS door_access_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anr_id UUID REFERENCES anrs(id) NOT NULL,
  user_id UUID,
  employee_id UUID,
  company_id UUID,
  schedule_id UUID,
  assignment_id UUID,
  device_id TEXT,
  -- Horodatage
  entry_at TIMESTAMPTZ NOT NULL,
  exit_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  -- Localisation entrée
  entry_gps_lat NUMERIC,
  entry_gps_lon NUMERIC,
  entry_gps_distance_meters NUMERIC,
  -- Localisation sortie
  exit_gps_lat NUMERIC,
  exit_gps_lon NUMERIC,
  exit_gps_distance_meters NUMERIC,
  -- Reconnaissance faciale
  face_verified_entry BOOLEAN DEFAULT false,
  face_verified_exit BOOLEAN DEFAULT false,
  face_confidence_entry NUMERIC,
  face_confidence_exit NUMERIC,
  -- Statut
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'timeout', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- AUTORISATIONS PLANIFIÉES
-- =============================================
CREATE TABLE IF NOT EXISTS door_scheduled_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anr_id UUID REFERENCES anrs(id) NOT NULL,
  granted_by UUID NOT NULL,
  -- Bénéficiaire (l'un ou l'autre)
  granted_to_user UUID,
  granted_to_company UUID,
  -- Détails
  name TEXT NOT NULL,
  description TEXT,
  -- Planification
  days_of_week INTEGER[] DEFAULT '{1,2,3,4,5}',
  time_from TIME NOT NULL,
  time_to TIME NOT NULL,
  valid_from DATE,
  valid_until DATE,
  recurrence TEXT DEFAULT 'weekly' CHECK (recurrence IN ('once', 'daily', 'weekly', 'monthly')),
  -- Reconnaissance faciale (entrée ET/OU sortie)
  require_face_recognition_entry BOOLEAN DEFAULT false,
  require_face_recognition_exit BOOLEAN DEFAULT false,
  -- Limites
  max_entries_per_day INTEGER DEFAULT 1,
  auto_clockout_minutes INTEGER DEFAULT 480,
  -- Notes
  notes TEXT,
  instructions_for_visitor TEXT,
  -- Statut
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TOKENS D'ACCÈS
-- =============================================
CREATE TABLE IF NOT EXISTS door_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id TEXT UNIQUE NOT NULL,
  token_hash TEXT NOT NULL,
  anr_id UUID REFERENCES anrs(id) NOT NULL,
  granted_by UUID NOT NULL,
  -- Bénéficiaire
  granted_to_user UUID,
  granted_to_company UUID,
  granted_to_employee UUID,
  visitor_device_id TEXT,
  -- Références
  call_id UUID REFERENCES call_logs(id),
  schedule_id UUID,
  session_id UUID,
  -- Type
  mode TEXT DEFAULT 'SINGLE' CHECK (mode IN ('SINGLE', 'SCHEDULED', 'EMERGENCY')),
  scope TEXT DEFAULT 'OPEN_DOOR' CHECK (scope IN ('OPEN_DOOR', 'ENTRY_ONLY', 'EXIT_ONLY')),
  -- Sécurité
  nonce TEXT NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT now(),
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  -- Consommation
  consumed_at TIMESTAMPTZ,
  consumed_result TEXT,
  consumed_by_module UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- LOGS D'ACCÈS (journalisation RGPD)
-- =============================================
CREATE TABLE IF NOT EXISTS door_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  door_module_id UUID,
  session_id UUID,
  token_id TEXT,
  anr_id UUID REFERENCES anrs(id),
  -- Acteurs
  resident_id UUID,
  visitor_user_id UUID,
  visitor_device_id TEXT,
  company_id UUID,
  employee_id UUID,
  schedule_id UUID,
  -- Action
  action TEXT NOT NULL CHECK (action IN ('ENTRY', 'EXIT', 'REJECTED', 'TIMEOUT', 'EMERGENCY')),
  method TEXT DEFAULT 'BLE' CHECK (method IN ('BLE', 'CALL', 'SCHEDULED', 'EMERGENCY', 'MANUAL')),
  -- Technique
  rssi INTEGER,
  gps_latitude NUMERIC,
  gps_longitude NUMERIC,
  gps_distance_meters NUMERIC,
  -- Résultat
  result TEXT NOT NULL CHECK (result IN ('SUCCESS', 'DENIED', 'ERROR', 'TIMEOUT')),
  error_code TEXT,
  error_details TEXT,
  -- Reconnaissance faciale
  face_verified BOOLEAN,
  face_confidence NUMERIC,
  face_required BOOLEAN DEFAULT false,
  -- Durée (pour sortie)
  duration_seconds INTEGER,
  -- Métadonnées
  device_firmware TEXT,
  device_id TEXT,
  user_agent TEXT,
  ip_address TEXT,
  timestamp_device TIMESTAMPTZ,
  timestamp_server TIMESTAMPTZ DEFAULT now(),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- SERVICES DE SECOURS AUTORISÉS
-- =============================================
CREATE TABLE IF NOT EXISTS emergency_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  organization_type TEXT NOT NULL CHECK (organization_type IN ('pompiers', 'samu', 'police', 'gendarmerie', 'other')),
  siret TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  coverage_zone TEXT,
  department_code TEXT,
  -- Vérification
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  verification_document_url TEXT,
  -- Statut
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- EMBEDDINGS FACIAUX (données biométriques RGPD)
-- =============================================
CREATE TABLE IF NOT EXISTS face_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Propriétaire (l'un ou l'autre)
  user_id UUID,
  employee_id UUID,
  -- Embedding (vecteur mathématique, PAS de photo)
  embedding JSONB NOT NULL,
  embedding_version TEXT DEFAULT 'v1',
  quality_score NUMERIC,
  -- Consentement RGPD explicite
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_timestamp TIMESTAMPTZ,
  consent_method TEXT,
  consent_ip_address TEXT,
  consent_user_agent TEXT,
  -- Métadonnées
  registered_at TIMESTAMPTZ DEFAULT now(),
  last_verified_at TIMESTAMPTZ,
  verification_count INTEGER DEFAULT 0,
  -- Suppression RGPD
  deleted_at TIMESTAMPTZ,
  deleted_reason TEXT,
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Contrainte : un seul embedding actif par utilisateur/employé
  CONSTRAINT one_active_embedding_per_user UNIQUE NULLS NOT DISTINCT (user_id, deleted_at),
  CONSTRAINT one_active_embedding_per_employee UNIQUE NULLS NOT DISTINCT (employee_id, deleted_at)
);

-- =============================================
-- ENTREPRISES ANR PRO
-- =============================================
CREATE TABLE IF NOT EXISTS pro_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identité
  name TEXT NOT NULL,
  legal_name TEXT,
  siret TEXT,
  siren TEXT,
  sector TEXT,
  company_type TEXT,
  logo_url TEXT,
  -- Contact
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  contact_name TEXT,
  -- Adresse
  address TEXT,
  postal_code TEXT,
  city TEXT,
  country TEXT DEFAULT 'France',
  -- Abonnement et plan
  subscription_id UUID,
  plan_type TEXT DEFAULT 'pro' CHECK (plan_type IN ('pro', 'entreprise', 'collectivite')),
  -- Limites
  max_employees INTEGER DEFAULT 30,
  max_active_authorizations INTEGER DEFAULT 100,
  -- Paramètres
  require_face_recognition_default BOOLEAN DEFAULT false,
  auto_clockout_minutes INTEGER DEFAULT 480,
  enable_gps_tracking BOOLEAN DEFAULT false,
  enable_client_signature BOOLEAN DEFAULT false,
  enable_geofencing BOOLEAN DEFAULT false,
  geofencing_radius_meters INTEGER DEFAULT 100,
  -- Webhooks (Enterprise/Collectivités uniquement)
  enable_webhook BOOLEAN DEFAULT false,
  webhook_url TEXT,
  webhook_secret TEXT,
  webhook_events TEXT[] DEFAULT '{}',
  -- Co-Pilot addon
  copilot_enabled BOOLEAN DEFAULT false,
  copilot_addon_price NUMERIC DEFAULT 9.99,
  -- Statut
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- EMPLOYÉS PRO
-- =============================================
CREATE TABLE IF NOT EXISTS pro_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES pro_companies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID,
  -- Identité
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  photo_url TEXT,
  -- Rôle
  role TEXT DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee')),
  department TEXT,
  employee_number TEXT,
  -- Permissions
  can_self_assign BOOLEAN DEFAULT false,
  can_manage_employees BOOLEAN DEFAULT false,
  max_hours_per_day INTEGER DEFAULT 10,
  -- Statut
  is_active BOOLEAN DEFAULT true,
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- AFFECTATIONS EMPLOYÉS (missions)
-- =============================================
CREATE TABLE IF NOT EXISTS pro_employee_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES pro_companies(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES pro_employees(id) ON DELETE CASCADE NOT NULL,
  schedule_id UUID NOT NULL,
  -- Planification
  assigned_date DATE NOT NULL,
  time_from TIME,
  time_to TIME,
  -- Mission
  mission_type TEXT,
  mission_notes TEXT,
  client_notes TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  -- Statut
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'cancelled', 'no_show')),
  -- Horodatage réel
  entry_at TIMESTAMPTZ,
  exit_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  -- Session d'accès liée
  session_id UUID,
  -- Validation client
  client_signature TEXT,
  client_signature_at TIMESTAMPTZ,
  client_signature_name TEXT,
  -- Feedback
  resident_rating INTEGER CHECK (resident_rating >= 1 AND resident_rating <= 5),
  resident_comment TEXT,
  employee_report TEXT,
  -- Géofencing
  geofencing_alerts INTEGER DEFAULT 0,
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- RÔLES ENTREPRISE
-- =============================================
CREATE TABLE IF NOT EXISTS pro_company_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES pro_companies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'viewer')),
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- =============================================
-- LOGS ACTIVITÉ ENTREPRISE
-- =============================================
CREATE TABLE IF NOT EXISTS pro_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES pro_companies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID,
  employee_id UUID,
  -- Action
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  -- Changements
  old_value JSONB,
  new_value JSONB,
  -- Contexte
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- GUIDES ASSISTANT CO-PILOT
-- =============================================
CREATE TABLE IF NOT EXISTS assistant_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identification
  guide_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  -- Étapes
  steps JSONB NOT NULL DEFAULT '[]',
  -- Conditions d'affichage
  trigger_paths TEXT[] DEFAULT '{}',
  trigger_actions TEXT[] DEFAULT '{}',
  required_plan TEXT[] DEFAULT '{pro,entreprise,collectivite}',
  -- Métadonnées
  estimated_duration_seconds INTEGER DEFAULT 60,
  difficulty TEXT DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'advanced')),
  -- Statut
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- SESSIONS CO-PILOT
-- =============================================
CREATE TABLE IF NOT EXISTS copilot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID,
  -- Contexte
  current_path TEXT,
  current_section TEXT,
  current_action TEXT,
  visible_elements JSONB DEFAULT '[]',
  form_state JSONB DEFAULT '{}',
  -- Guide en cours
  active_guide_id UUID REFERENCES assistant_guides(id),
  current_step INTEGER DEFAULT 0,
  guide_started_at TIMESTAMPTZ,
  guide_completed_at TIMESTAMPTZ,
  -- Historique conversation
  messages JSONB DEFAULT '[]',
  -- Statut
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  started_at TIMESTAMPTZ DEFAULT now(),
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- USAGE CO-PILOT (facturation)
-- =============================================
CREATE TABLE IF NOT EXISTS copilot_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID,
  session_id UUID REFERENCES copilot_sessions(id),
  -- Usage
  messages_count INTEGER DEFAULT 0,
  guides_completed INTEGER DEFAULT 0,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  estimated_cost NUMERIC DEFAULT 0,
  -- Période
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  -- Un enregistrement par utilisateur par jour
  UNIQUE(user_id, usage_date)
);

-- =============================================
-- INDEX POUR PERFORMANCES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_door_modules_anr_id ON door_modules(anr_id);
CREATE INDEX IF NOT EXISTS idx_door_modules_device_id ON door_modules(device_id);
CREATE INDEX IF NOT EXISTS idx_door_access_sessions_anr_id ON door_access_sessions(anr_id);
CREATE INDEX IF NOT EXISTS idx_door_access_sessions_user_id ON door_access_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_door_access_sessions_status ON door_access_sessions(status);
CREATE INDEX IF NOT EXISTS idx_door_access_sessions_entry_at ON door_access_sessions(entry_at);
CREATE INDEX IF NOT EXISTS idx_door_scheduled_access_anr_id ON door_scheduled_access(anr_id);
CREATE INDEX IF NOT EXISTS idx_door_scheduled_access_granted_to_user ON door_scheduled_access(granted_to_user);
CREATE INDEX IF NOT EXISTS idx_door_scheduled_access_granted_to_company ON door_scheduled_access(granted_to_company);
CREATE INDEX IF NOT EXISTS idx_door_access_tokens_token_id ON door_access_tokens(token_id);
CREATE INDEX IF NOT EXISTS idx_door_access_tokens_anr_id ON door_access_tokens(anr_id);
CREATE INDEX IF NOT EXISTS idx_door_access_logs_anr_id ON door_access_logs(anr_id);
CREATE INDEX IF NOT EXISTS idx_door_access_logs_session_id ON door_access_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_door_access_logs_timestamp ON door_access_logs(timestamp_server);
CREATE INDEX IF NOT EXISTS idx_door_access_logs_action ON door_access_logs(action);
CREATE INDEX IF NOT EXISTS idx_face_embeddings_user_id ON face_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_face_embeddings_employee_id ON face_embeddings(employee_id);
CREATE INDEX IF NOT EXISTS idx_pro_companies_plan_type ON pro_companies(plan_type);
CREATE INDEX IF NOT EXISTS idx_pro_employees_company_id ON pro_employees(company_id);
CREATE INDEX IF NOT EXISTS idx_pro_employees_user_id ON pro_employees(user_id);
CREATE INDEX IF NOT EXISTS idx_pro_employee_assignments_employee_id ON pro_employee_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_pro_employee_assignments_assigned_date ON pro_employee_assignments(assigned_date);
CREATE INDEX IF NOT EXISTS idx_pro_employee_assignments_status ON pro_employee_assignments(status);
CREATE INDEX IF NOT EXISTS idx_copilot_sessions_user_id ON copilot_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_copilot_sessions_company_id ON copilot_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_copilot_usage_user_id ON copilot_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_copilot_usage_usage_date ON copilot_usage(usage_date);

-- =============================================
-- RLS POLICIES
-- =============================================

-- door_modules
ALTER TABLE door_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage door modules"
ON door_modules FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Residents can view their ANR door modules"
ON door_modules FOR SELECT
USING (EXISTS (
  SELECT 1 FROM residents r
  JOIN habitations h ON h.id = r.habitation_id
  WHERE h.anr_id = door_modules.anr_id
  AND r.user_id = auth.uid()
  AND r.status = 'verified'
));

-- door_access_sessions
ALTER TABLE door_access_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
ON door_access_sessions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Residents can view sessions for their ANR"
ON door_access_sessions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM residents r
  JOIN habitations h ON h.id = r.habitation_id
  WHERE h.anr_id = door_access_sessions.anr_id
  AND r.user_id = auth.uid()
  AND r.status = 'verified'
));

CREATE POLICY "Service can manage sessions"
ON door_access_sessions FOR ALL
USING (true);

-- door_scheduled_access
ALTER TABLE door_scheduled_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage scheduled access for their ANR"
ON door_scheduled_access FOR ALL
USING (EXISTS (
  SELECT 1 FROM residents r
  JOIN habitations h ON h.id = r.habitation_id
  WHERE h.anr_id = door_scheduled_access.anr_id
  AND r.user_id = auth.uid()
  AND r.is_owner = true
  AND r.status = 'verified'
));

CREATE POLICY "Users can view their granted access"
ON door_scheduled_access FOR SELECT
USING (granted_to_user = auth.uid());

CREATE POLICY "Companies can view their granted access"
ON door_scheduled_access FOR SELECT
USING (EXISTS (
  SELECT 1 FROM pro_company_roles pcr
  WHERE pcr.company_id = door_scheduled_access.granted_to_company
  AND pcr.user_id = auth.uid()
));

-- door_access_tokens
ALTER TABLE door_access_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can manage tokens"
ON door_access_tokens FOR ALL
USING (true);

-- door_access_logs
ALTER TABLE door_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all logs"
ON door_access_logs FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'analyst'));

CREATE POLICY "Residents can view logs for their ANR"
ON door_access_logs FOR SELECT
USING (EXISTS (
  SELECT 1 FROM residents r
  JOIN habitations h ON h.id = r.habitation_id
  WHERE h.anr_id = door_access_logs.anr_id
  AND r.user_id = auth.uid()
  AND r.status = 'verified'
));

CREATE POLICY "Service can insert logs"
ON door_access_logs FOR INSERT
WITH CHECK (true);

-- emergency_services
ALTER TABLE emergency_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage emergency services"
ON emergency_services FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Anyone can view active emergency services"
ON emergency_services FOR SELECT
USING (is_active = true AND is_verified = true);

-- face_embeddings (données biométriques - RLS strict)
ALTER TABLE face_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own face embedding"
ON face_embeddings FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Company admins can manage employee embeddings"
ON face_embeddings FOR ALL
USING (EXISTS (
  SELECT 1 FROM pro_employees pe
  JOIN pro_company_roles pcr ON pcr.company_id = pe.company_id
  WHERE pe.id = face_embeddings.employee_id
  AND pcr.user_id = auth.uid()
  AND pcr.role IN ('owner', 'admin')
));

CREATE POLICY "Service can manage embeddings"
ON face_embeddings FOR ALL
USING (true);

-- pro_companies
ALTER TABLE pro_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view their company"
ON pro_companies FOR SELECT
USING (EXISTS (
  SELECT 1 FROM pro_company_roles pcr
  WHERE pcr.company_id = pro_companies.id
  AND pcr.user_id = auth.uid()
));

CREATE POLICY "Company owners can update their company"
ON pro_companies FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM pro_company_roles pcr
  WHERE pcr.company_id = pro_companies.id
  AND pcr.user_id = auth.uid()
  AND pcr.role = 'owner'
));

CREATE POLICY "Admins can manage all companies"
ON pro_companies FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Authenticated can create company"
ON pro_companies FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- pro_employees
ALTER TABLE pro_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view employees"
ON pro_employees FOR SELECT
USING (EXISTS (
  SELECT 1 FROM pro_company_roles pcr
  WHERE pcr.company_id = pro_employees.company_id
  AND pcr.user_id = auth.uid()
));

CREATE POLICY "Company admins can manage employees"
ON pro_employees FOR ALL
USING (EXISTS (
  SELECT 1 FROM pro_company_roles pcr
  WHERE pcr.company_id = pro_employees.company_id
  AND pcr.user_id = auth.uid()
  AND pcr.role IN ('owner', 'admin', 'manager')
));

CREATE POLICY "Employees can view themselves"
ON pro_employees FOR SELECT
USING (user_id = auth.uid());

-- pro_employee_assignments
ALTER TABLE pro_employee_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view assignments"
ON pro_employee_assignments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM pro_company_roles pcr
  WHERE pcr.company_id = pro_employee_assignments.company_id
  AND pcr.user_id = auth.uid()
));

CREATE POLICY "Company admins can manage assignments"
ON pro_employee_assignments FOR ALL
USING (EXISTS (
  SELECT 1 FROM pro_company_roles pcr
  WHERE pcr.company_id = pro_employee_assignments.company_id
  AND pcr.user_id = auth.uid()
  AND pcr.role IN ('owner', 'admin', 'manager')
));

CREATE POLICY "Employees can view their own assignments"
ON pro_employee_assignments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM pro_employees pe
  WHERE pe.id = pro_employee_assignments.employee_id
  AND pe.user_id = auth.uid()
));

CREATE POLICY "Employees can update their own assignments"
ON pro_employee_assignments FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM pro_employees pe
  WHERE pe.id = pro_employee_assignments.employee_id
  AND pe.user_id = auth.uid()
));

-- pro_company_roles
ALTER TABLE pro_company_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company owners can manage roles"
ON pro_company_roles FOR ALL
USING (EXISTS (
  SELECT 1 FROM pro_company_roles pcr
  WHERE pcr.company_id = pro_company_roles.company_id
  AND pcr.user_id = auth.uid()
  AND pcr.role = 'owner'
));

CREATE POLICY "Users can view their own roles"
ON pro_company_roles FOR SELECT
USING (user_id = auth.uid());

-- pro_activity_logs
ALTER TABLE pro_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can view activity logs"
ON pro_activity_logs FOR SELECT
USING (EXISTS (
  SELECT 1 FROM pro_company_roles pcr
  WHERE pcr.company_id = pro_activity_logs.company_id
  AND pcr.user_id = auth.uid()
  AND pcr.role IN ('owner', 'admin')
));

CREATE POLICY "Service can insert activity logs"
ON pro_activity_logs FOR INSERT
WITH CHECK (true);

-- assistant_guides
ALTER TABLE assistant_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage guides"
ON assistant_guides FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Authenticated can view active guides"
ON assistant_guides FOR SELECT
USING (is_active = true);

-- copilot_sessions
ALTER TABLE copilot_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own sessions"
ON copilot_sessions FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Service can manage sessions"
ON copilot_sessions FOR ALL
USING (true);

-- copilot_usage
ALTER TABLE copilot_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage"
ON copilot_usage FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Company admins can view company usage"
ON copilot_usage FOR SELECT
USING (EXISTS (
  SELECT 1 FROM pro_company_roles pcr
  WHERE pcr.company_id = copilot_usage.company_id
  AND pcr.user_id = auth.uid()
  AND pcr.role IN ('owner', 'admin')
));

CREATE POLICY "Admins can view all usage"
ON copilot_usage FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Service can manage usage"
ON copilot_usage FOR ALL
USING (true);

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_door_modules_updated_at
  BEFORE UPDATE ON door_modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_trigger();

CREATE TRIGGER update_door_scheduled_access_updated_at
  BEFORE UPDATE ON door_scheduled_access
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_trigger();

CREATE TRIGGER update_emergency_services_updated_at
  BEFORE UPDATE ON emergency_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_trigger();

CREATE TRIGGER update_face_embeddings_updated_at
  BEFORE UPDATE ON face_embeddings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_trigger();

CREATE TRIGGER update_pro_companies_updated_at
  BEFORE UPDATE ON pro_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_trigger();

CREATE TRIGGER update_pro_employees_updated_at
  BEFORE UPDATE ON pro_employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_trigger();

CREATE TRIGGER update_pro_employee_assignments_updated_at
  BEFORE UPDATE ON pro_employee_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_trigger();

CREATE TRIGGER update_assistant_guides_updated_at
  BEFORE UPDATE ON assistant_guides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_trigger();

-- Trigger pour calculer la durée de session à la sortie
CREATE OR REPLACE FUNCTION calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.exit_at IS NOT NULL AND OLD.exit_at IS NULL THEN
    NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.exit_at - NEW.entry_at))::INTEGER;
    NEW.status = 'completed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER calculate_door_session_duration
  BEFORE UPDATE ON door_access_sessions
  FOR EACH ROW EXECUTE FUNCTION calculate_session_duration();

-- Trigger pour calculer la durée d'assignment
CREATE OR REPLACE FUNCTION calculate_assignment_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.exit_at IS NOT NULL AND NEW.entry_at IS NOT NULL AND OLD.exit_at IS NULL THEN
    NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.exit_at - NEW.entry_at))::INTEGER / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER calculate_assignment_duration
  BEFORE UPDATE ON pro_employee_assignments
  FOR EACH ROW EXECUTE FUNCTION calculate_assignment_duration();

-- Trigger pour vérifier le nombre max d'employés
CREATE OR REPLACE FUNCTION check_max_employees()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  max_allowed INTEGER;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM pro_employees
  WHERE company_id = NEW.company_id AND is_active = true;
  
  SELECT max_employees INTO max_allowed
  FROM pro_companies
  WHERE id = NEW.company_id;
  
  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Maximum employees limit reached (% max)', max_allowed;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER check_max_employees_trigger
  BEFORE INSERT ON pro_employees
  FOR EACH ROW EXECUTE FUNCTION check_max_employees();