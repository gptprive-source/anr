-- =====================================================
-- PHASE 1: Machine d'état et inscription enrichie relais
-- =====================================================

-- 1. Créer l'enum pour le statut du relais
CREATE TYPE relay_status AS ENUM (
  'draft',
  'identity_verified', 
  'contract_signed',
  'anr_assigned',
  'training_validated',
  'active',
  'suspended'
);

-- 2. Créer l'enum pour le type de relais
CREATE TYPE relay_type AS ENUM (
  'professional',
  'individual'
);

-- 3. Ajouter les colonnes à relay_points pour la machine d'état et KYC
ALTER TABLE relay_points 
  ADD COLUMN IF NOT EXISTS status relay_status DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS relay_type relay_type DEFAULT 'individual',
  -- KYC Professionnel
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS legal_form TEXT,
  ADD COLUMN IF NOT EXISTS siret TEXT,
  ADD COLUMN IF NOT EXISTS legal_representative_name TEXT,
  -- KYC Commun
  ADD COLUMN IF NOT EXISTS id_document_url TEXT,
  ADD COLUMN IF NOT EXISTS address_proof_url TEXT,
  -- Documents et contrat
  ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS training_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS training_score INTEGER,
  -- Rémunération détaillée
  ADD COLUMN IF NOT EXISTS deposit_earnings NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pickup_earnings NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rate_per_deposit NUMERIC(5,2) DEFAULT 0.50,
  ADD COLUMN IF NOT EXISTS rate_per_pickup NUMERIC(5,2) DEFAULT 0.50,
  -- Suspension
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_reason TEXT,
  ADD COLUMN IF NOT EXISTS suspended_by UUID;

-- 4. Créer la table des contrats relais
CREATE TABLE IF NOT EXISTS relay_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relay_point_id UUID NOT NULL REFERENCES relay_points(id) ON DELETE CASCADE,
  contract_version INTEGER NOT NULL DEFAULT 1,
  contract_template_id UUID,
  contract_html TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  signer_ip TEXT,
  signer_user_agent TEXT,
  signature_hash TEXT,
  accepted_terms JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  superseded_by UUID REFERENCES relay_contracts(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Créer la table des litiges relais
CREATE TABLE IF NOT EXISTS relay_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relay_point_id UUID NOT NULL REFERENCES relay_points(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES parcels(id),
  opened_by UUID NOT NULL,
  dispute_type TEXT NOT NULL CHECK (dispute_type IN ('missing_parcel', 'damaged_parcel', 'wrong_recipient', 'payment_issue', 'other')),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Créer la table des transactions de revenus relais
CREATE TABLE IF NOT EXISTS relay_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relay_point_id UUID NOT NULL REFERENCES relay_points(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES parcels(id),
  proof_id UUID REFERENCES parcel_proofs(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'pickup', 'bonus', 'penalty', 'payout')),
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled')),
  description TEXT,
  payout_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Créer la table des paiements relais
CREATE TABLE IF NOT EXISTS relay_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relay_point_id UUID NOT NULL REFERENCES relay_points(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  earnings_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  iban TEXT,
  transfer_reference TEXT,
  paid_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Créer le bucket storage pour les documents relais
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('relay-documents', 'relay-documents', false, 10485760) -- 10MB max
ON CONFLICT (id) DO NOTHING;

-- 9. Policies RLS pour relay_contracts
ALTER TABLE relay_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own relay contracts" ON relay_contracts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM relay_points 
      WHERE relay_points.id = relay_contracts.relay_point_id 
      AND relay_points.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own relay contracts" ON relay_contracts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM relay_points 
      WHERE relay_points.id = relay_contracts.relay_point_id 
      AND relay_points.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all relay contracts" ON relay_contracts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 10. Policies RLS pour relay_disputes
ALTER TABLE relay_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own relay disputes" ON relay_disputes
  FOR SELECT USING (
    opened_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM relay_points 
      WHERE relay_points.id = relay_disputes.relay_point_id 
      AND relay_points.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create disputes" ON relay_disputes
  FOR INSERT WITH CHECK (opened_by = auth.uid());

CREATE POLICY "Admins can manage all disputes" ON relay_disputes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 11. Policies RLS pour relay_earnings
ALTER TABLE relay_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own relay earnings" ON relay_earnings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM relay_points 
      WHERE relay_points.id = relay_earnings.relay_point_id 
      AND relay_points.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all relay earnings" ON relay_earnings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 12. Policies RLS pour relay_payouts
ALTER TABLE relay_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own relay payouts" ON relay_payouts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM relay_points 
      WHERE relay_points.id = relay_payouts.relay_point_id 
      AND relay_points.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all relay payouts" ON relay_payouts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 13. Policies pour storage bucket relay-documents
CREATE POLICY "Users can upload their relay documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'relay-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their relay documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'relay-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can view all relay documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'relay-documents' AND
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 14. Trigger pour updated_at sur relay_disputes
CREATE TRIGGER update_relay_disputes_updated_at
  BEFORE UPDATE ON relay_disputes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 15. Mettre à jour les relais existants avec le bon statut
UPDATE relay_points 
SET status = CASE 
  WHEN is_verified = true AND is_active = true THEN 'active'::relay_status
  WHEN is_verified = true AND is_active = false THEN 'suspended'::relay_status
  ELSE 'draft'::relay_status
END
WHERE status IS NULL OR status = 'draft';