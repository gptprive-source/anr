-- Add NFC serial column to ANRs table
ALTER TABLE public.anrs ADD COLUMN IF NOT EXISTS nfc_serial TEXT;

-- Create index for NFC serial lookup
CREATE INDEX IF NOT EXISTS idx_anrs_nfc_serial ON public.anrs(nfc_serial) WHERE nfc_serial IS NOT NULL;

-- Create parcel_qr_tokens table for offline-first delivery system
CREATE TABLE IF NOT EXISTS public.parcel_qr_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT UNIQUE NOT NULL,
  parcel_id UUID REFERENCES public.parcels(id) ON DELETE CASCADE,
  expected_anr_id UUID REFERENCES public.anrs(id),
  expected_nfc_serial TEXT,
  proof_type TEXT NOT NULL CHECK (proof_type IN ('deposit', 'delivery', 'pickup')),
  emitter_type TEXT NOT NULL CHECK (emitter_type IN ('driver', 'relay')),
  emitter_id UUID NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  nfc_scan_at TIMESTAMPTZ,
  qr_scan_at TIMESTAMPTZ,
  nfc_serial_scanned TEXT,
  nfc_anr_code_scanned TEXT,
  geo_latitude NUMERIC,
  geo_longitude NUMERIC,
  local_proof_hash TEXT,
  status TEXT DEFAULT 'prepared' CHECK (status IN ('prepared', 'nfc_unlocked', 'consumed', 'expired', 'conflict')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_qr_tokens_parcel ON public.parcel_qr_tokens(parcel_id);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_status ON public.parcel_qr_tokens(status);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_emitter ON public.parcel_qr_tokens(emitter_type, emitter_id);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_expires ON public.parcel_qr_tokens(expires_at) WHERE status = 'prepared';

-- Enable RLS
ALTER TABLE public.parcel_qr_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for parcel_qr_tokens
CREATE POLICY "Service can manage QR tokens"
ON public.parcel_qr_tokens
FOR ALL
USING (true);

CREATE POLICY "Admins can view QR tokens"
ON public.parcel_qr_tokens
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Add parcel_qr_tokens to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.parcel_qr_tokens;