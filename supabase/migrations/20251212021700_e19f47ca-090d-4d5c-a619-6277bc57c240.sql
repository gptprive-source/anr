-- Table des codes de parrainage (1 par utilisateur)
CREATE TABLE public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id)
);

-- Table des parrainages (tracking filleuls)
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id),
  referred_id UUID NOT NULL REFERENCES public.profiles(id),
  referral_code_id UUID NOT NULL REFERENCES public.referral_codes(id),
  status VARCHAR(20) DEFAULT 'pending',
  subscription_paid_at TIMESTAMPTZ,
  reward_amount DECIMAL(10,2) DEFAULT 5.00,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(referred_id)
);

-- Table des paiements d'affiliation
CREATE TABLE public.referral_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  amount DECIMAL(10,2) NOT NULL,
  referrals_count INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  stripe_transfer_id VARCHAR(100),
  payout_method VARCHAR(20) DEFAULT 'bank_transfer',
  iban VARCHAR(50),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ajout colonnes profils pour IBAN et solde
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS iban VARCHAR(50);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_balance DECIMAL(10,2) DEFAULT 0;

-- Enable RLS
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_payouts ENABLE ROW LEVEL SECURITY;

-- Policies for referral_codes
CREATE POLICY "Users can view their own referral code"
ON public.referral_codes FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own referral code"
ON public.referral_codes FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all referral codes"
ON public.referral_codes FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Policies for referrals
CREATE POLICY "Users can view referrals where they are referrer"
ON public.referrals FOR SELECT
USING (referrer_id = auth.uid());

CREATE POLICY "Service can insert referrals"
ON public.referrals FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service can update referrals"
ON public.referrals FOR UPDATE
USING (true);

CREATE POLICY "Admins can view all referrals"
ON public.referrals FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Policies for referral_payouts
CREATE POLICY "Users can view their own payouts"
ON public.referral_payouts FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Service can manage payouts"
ON public.referral_payouts FOR ALL
USING (true);

CREATE POLICY "Admins can view all payouts"
ON public.referral_payouts FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update payouts"
ON public.referral_payouts FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Index for faster lookups
CREATE INDEX idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_status ON public.referrals(status);
CREATE INDEX idx_referral_payouts_user ON public.referral_payouts(user_id);
CREATE INDEX idx_referral_payouts_status ON public.referral_payouts(status);