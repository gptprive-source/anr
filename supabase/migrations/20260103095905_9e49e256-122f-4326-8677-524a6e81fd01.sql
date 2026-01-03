-- Table pour stocker les appareils autorisés par utilisateur
CREATE TABLE public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_id TEXT NOT NULL,
  device_name TEXT,
  is_primary BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_id)
);

-- Table pour les sessions d'autorisation d'appareil (QR code)
CREATE TABLE public.device_auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  new_device_id TEXT NOT NULL,
  new_device_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by_device_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),
  approved_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_auth_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_devices
CREATE POLICY "Users can view their own devices"
  ON public.user_devices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own devices"
  ON public.user_devices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own devices"
  ON public.user_devices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own devices"
  ON public.user_devices FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service can manage devices"
  ON public.user_devices FOR ALL
  USING (true);

-- RLS policies for device_auth_sessions
CREATE POLICY "Users can view their own auth sessions"
  ON public.device_auth_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own auth sessions"
  ON public.device_auth_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own auth sessions"
  ON public.device_auth_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service can manage auth sessions"
  ON public.device_auth_sessions FOR ALL
  USING (true);

-- Enable realtime for device_auth_sessions
ALTER TABLE public.device_auth_sessions REPLICA IDENTITY FULL;

-- Index for faster lookups
CREATE INDEX idx_user_devices_user_id ON public.user_devices(user_id);
CREATE INDEX idx_user_devices_device_id ON public.user_devices(device_id);
CREATE INDEX idx_device_auth_sessions_token ON public.device_auth_sessions(session_token);
CREATE INDEX idx_device_auth_sessions_user_id ON public.device_auth_sessions(user_id);