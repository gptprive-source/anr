
-- =============================================
-- MODULE RELAIS COLIS ANR - Tables principales
-- =============================================

-- D'abord, modifier la contrainte de catégorie pour inclure 'relay'
ALTER TABLE public.app_config DROP CONSTRAINT IF EXISTS app_config_category_check;
ALTER TABLE public.app_config ADD CONSTRAINT app_config_category_check 
  CHECK (category = ANY (ARRAY['pricing'::text, 'limits'::text, 'features'::text, 'plans'::text, 'content'::text, 'facturation'::text, 'relay'::text]));

-- 1. Table des points relais (résidents volontaires)
CREATE TABLE public.relay_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anr_id UUID NOT NULL REFERENCES public.anrs(id) ON DELETE CASCADE,
  
  display_name TEXT NOT NULL,
  phone TEXT,
  
  max_capacity INTEGER NOT NULL DEFAULT 5,
  current_capacity INTEGER NOT NULL DEFAULT 0,
  accepted_parcel_types TEXT[] DEFAULT ARRAY['standard', 'fragile', 'volumineux']::TEXT[],
  availability_schedule JSONB DEFAULT '{}'::JSONB,
  
  iban TEXT,
  total_earnings NUMERIC(10,2) DEFAULT 0,
  pending_earnings NUMERIC(10,2) DEFAULT 0,
  
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  
  total_parcels_handled INTEGER DEFAULT 0,
  average_rating NUMERIC(3,2),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id),
  UNIQUE(anr_id)
);

-- 2. Table des transporteurs
CREATE TABLE public.carriers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  company_name TEXT NOT NULL,
  siret TEXT,
  contact_name TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  address TEXT,
  
  api_key_hash TEXT,
  api_enabled BOOLEAN DEFAULT false,
  webhook_url TEXT,
  webhook_secret TEXT,
  
  stripe_customer_id TEXT,
  billing_email TEXT,
  
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  
  total_parcels INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(contact_email),
  UNIQUE(siret)
);

-- 3. Table des colis
CREATE TABLE public.parcels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  tracking_number TEXT NOT NULL UNIQUE,
  carrier_id UUID REFERENCES public.carriers(id) ON DELETE SET NULL,
  external_tracking_id TEXT,
  
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_anr_id UUID REFERENCES public.anrs(id) ON DELETE SET NULL,
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT,
  recipient_email TEXT,
  
  relay_point_id UUID REFERENCES public.relay_points(id) ON DELETE SET NULL,
  
  delivery_driver_id TEXT,
  delivery_driver_name TEXT,
  
  parcel_type TEXT DEFAULT 'standard',
  weight_kg NUMERIC(6,2),
  dimensions_cm TEXT,
  description TEXT,
  declared_value NUMERIC(10,2),
  
  status TEXT NOT NULL DEFAULT 'created',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  estimated_delivery_at TIMESTAMPTZ,
  deposited_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  max_storage_until TIMESTAMPTZ,
  
  metadata JSONB DEFAULT '{}'::JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Table des preuves
CREATE TABLE public.parcel_proofs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  parcel_id UUID NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  proof_type TEXT NOT NULL,
  
  actor_user_id UUID REFERENCES auth.users(id),
  actor_relay_id UUID REFERENCES public.relay_points(id),
  actor_carrier_id UUID REFERENCES public.carriers(id),
  actor_driver_id TEXT,
  actor_name TEXT,
  
  recipient_user_id UUID REFERENCES auth.users(id),
  recipient_name TEXT,
  
  geo_latitude NUMERIC(10,7),
  geo_longitude NUMERIC(10,7),
  geo_accuracy_m NUMERIC(6,2),
  
  timestamp_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  timestamp_device TIMESTAMPTZ,
  timezone TEXT DEFAULT 'Europe/Paris',
  
  device_id_hash TEXT,
  device_info JSONB DEFAULT '{}'::JSONB,
  scan_method TEXT DEFAULT 'NFC',
  
  proof_hash TEXT NOT NULL,
  signature TEXT,
  proof_data JSONB NOT NULL,
  
  notes TEXT,
  photo_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Table des paiements aux relais
CREATE TABLE public.relay_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  relay_point_id UUID NOT NULL REFERENCES public.relay_points(id) ON DELETE CASCADE,
  
  amount NUMERIC(10,2) NOT NULL,
  parcels_count INTEGER NOT NULL DEFAULT 0,
  
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_transfer_id TEXT,
  paid_at TIMESTAMPTZ,
  
  details JSONB DEFAULT '[]'::JSONB,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Table des factures transporteurs
CREATE TABLE public.carrier_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  carrier_id UUID NOT NULL REFERENCES public.carriers(id) ON DELETE CASCADE,
  
  invoice_number TEXT NOT NULL UNIQUE,
  
  amount_ht NUMERIC(10,2) NOT NULL,
  vat_rate NUMERIC(4,2) DEFAULT 20.00,
  amount_ttc NUMERIC(10,2) NOT NULL,
  
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  parcels_count INTEGER NOT NULL DEFAULT 0,
  
  status TEXT NOT NULL DEFAULT 'draft',
  
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  paid_at TIMESTAMPTZ,
  due_date DATE,
  
  line_items JSONB DEFAULT '[]'::JSONB,
  pdf_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- INDEX
CREATE INDEX idx_relay_points_user_id ON public.relay_points(user_id);
CREATE INDEX idx_relay_points_anr_id ON public.relay_points(anr_id);
CREATE INDEX idx_relay_points_active ON public.relay_points(is_active) WHERE is_active = true;

CREATE INDEX idx_carriers_api_enabled ON public.carriers(api_enabled) WHERE api_enabled = true;
CREATE INDEX idx_carriers_email ON public.carriers(contact_email);

CREATE INDEX idx_parcels_tracking ON public.parcels(tracking_number);
CREATE INDEX idx_parcels_status ON public.parcels(status);
CREATE INDEX idx_parcels_relay ON public.parcels(relay_point_id);
CREATE INDEX idx_parcels_recipient ON public.parcels(recipient_user_id);
CREATE INDEX idx_parcels_carrier ON public.parcels(carrier_id);
CREATE INDEX idx_parcels_created ON public.parcels(created_at DESC);

CREATE INDEX idx_parcel_proofs_parcel ON public.parcel_proofs(parcel_id);
CREATE INDEX idx_parcel_proofs_type ON public.parcel_proofs(proof_type);
CREATE INDEX idx_parcel_proofs_timestamp ON public.parcel_proofs(timestamp_utc DESC);

CREATE INDEX idx_relay_payouts_relay ON public.relay_payouts(relay_point_id);
CREATE INDEX idx_relay_payouts_status ON public.relay_payouts(status);

CREATE INDEX idx_carrier_invoices_carrier ON public.carrier_invoices(carrier_id);
CREATE INDEX idx_carrier_invoices_status ON public.carrier_invoices(status);

-- RLS
ALTER TABLE public.relay_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcel_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relay_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carrier_invoices ENABLE ROW LEVEL SECURITY;

-- relay_points policies
CREATE POLICY "Users can view their own relay point" ON public.relay_points FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create their own relay point" ON public.relay_points FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own relay point" ON public.relay_points FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Anyone can view active relay points" ON public.relay_points FOR SELECT USING (is_active = true AND is_verified = true);
CREATE POLICY "Admins can manage all relay points" ON public.relay_points FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- carriers policies
CREATE POLICY "Admins can manage carriers" ON public.carriers FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Service can manage carriers" ON public.carriers FOR ALL USING (true);

-- parcels policies
CREATE POLICY "Recipients can view their parcels" ON public.parcels FOR SELECT USING (recipient_user_id = auth.uid());
CREATE POLICY "Relay points can view assigned parcels" ON public.parcels FOR SELECT USING (EXISTS (SELECT 1 FROM public.relay_points rp WHERE rp.id = parcels.relay_point_id AND rp.user_id = auth.uid()));
CREATE POLICY "Service can manage parcels" ON public.parcels FOR ALL USING (true);
CREATE POLICY "Admins can manage parcels" ON public.parcels FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- parcel_proofs policies
CREATE POLICY "Users can view proofs for their parcels" ON public.parcel_proofs FOR SELECT USING (EXISTS (SELECT 1 FROM public.parcels p WHERE p.id = parcel_proofs.parcel_id AND p.recipient_user_id = auth.uid()));
CREATE POLICY "Relay points can view their proofs" ON public.parcel_proofs FOR SELECT USING (EXISTS (SELECT 1 FROM public.relay_points rp WHERE rp.id = parcel_proofs.actor_relay_id AND rp.user_id = auth.uid()));
CREATE POLICY "Service can manage proofs" ON public.parcel_proofs FOR ALL USING (true);
CREATE POLICY "Admins can view all proofs" ON public.parcel_proofs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- relay_payouts policies
CREATE POLICY "Relay points can view their payouts" ON public.relay_payouts FOR SELECT USING (EXISTS (SELECT 1 FROM public.relay_points rp WHERE rp.id = relay_payouts.relay_point_id AND rp.user_id = auth.uid()));
CREATE POLICY "Admins can manage payouts" ON public.relay_payouts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Service can manage payouts" ON public.relay_payouts FOR ALL USING (true);

-- carrier_invoices policies
CREATE POLICY "Admins can manage invoices" ON public.carrier_invoices FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Service can manage invoices" ON public.carrier_invoices FOR ALL USING (true);

-- Triggers
CREATE TRIGGER update_relay_points_updated_at BEFORE UPDATE ON public.relay_points FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_carriers_updated_at BEFORE UPDATE ON public.carriers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_parcels_updated_at BEFORE UPDATE ON public.parcels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_relay_payouts_updated_at BEFORE UPDATE ON public.relay_payouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_carrier_invoices_updated_at BEFORE UPDATE ON public.carrier_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Config par défaut
INSERT INTO public.app_config (key, value, category, description) VALUES
  ('relay_module_enabled', 'false', 'relay', 'Activer/désactiver le module relais colis'),
  ('relay_rate_per_parcel', '1.50', 'relay', 'Rémunération par colis traité (€)'),
  ('relay_payout_threshold', '20', 'relay', 'Seuil minimum pour paiement automatique (€)'),
  ('relay_max_storage_days', '14', 'relay', 'Durée maximale de garde en relais (jours)'),
  ('carrier_rate_per_parcel', '0.50', 'relay', 'Tarif facturé aux transporteurs par colis (€)'),
  ('relay_notification_hours_before', '24', 'relay', 'Heures avant expiration pour notification')
ON CONFLICT (key) DO NOTHING;
