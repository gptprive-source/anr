-- Table pour enregistrer les anomalies de sécurité opérationnelles
CREATE TABLE public.security_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anomaly_type TEXT NOT NULL, -- 'gps_distance_exceeded', 'call_duration_exceeded', 'nfc_outside_perimeter'
  severity TEXT NOT NULL DEFAULT 'warning', -- 'warning', 'critical'
  
  -- Contexte de l'anomalie
  call_id UUID REFERENCES call_logs(id),
  anr_id UUID REFERENCES anrs(id),
  habitation_id UUID REFERENCES habitations(id),
  
  -- Données de l'anomalie
  visitor_latitude NUMERIC,
  visitor_longitude NUMERIC,
  anr_latitude NUMERIC,
  anr_longitude NUMERIC,
  distance_meters NUMERIC,
  max_allowed_distance_meters INTEGER,
  
  call_duration_seconds INTEGER,
  max_allowed_duration_seconds INTEGER,
  
  -- Métadonnées
  details JSONB,
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_security_anomalies_type ON security_anomalies(anomaly_type);
CREATE INDEX idx_security_anomalies_created ON security_anomalies(created_at DESC);
CREATE INDEX idx_security_anomalies_acknowledged ON security_anomalies(is_acknowledged);

-- Enable RLS
ALTER TABLE security_anomalies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view anomalies"
ON security_anomalies FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'analyst'));

CREATE POLICY "Service can insert anomalies"
ON security_anomalies FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update anomalies"
ON security_anomalies FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Fonction pour détecter les anomalies GPS (appels hors périmètre)
CREATE OR REPLACE FUNCTION detect_gps_distance_anomalies()
RETURNS TABLE(
  call_id UUID,
  anr_id UUID,
  habitation_id UUID,
  visitor_lat NUMERIC,
  visitor_lon NUMERIC,
  anr_lat NUMERIC,
  anr_lon NUMERIC,
  distance_m NUMERIC,
  max_distance_m INTEGER,
  call_started_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH config AS (
    SELECT COALESCE((value::TEXT)::INTEGER, 30) as max_distance
    FROM app_config WHERE key = 'max_distance_meters'
    LIMIT 1
  )
  SELECT 
    cl.id as call_id,
    a.id as anr_id,
    h.id as habitation_id,
    cl.visitor_latitude as visitor_lat,
    cl.visitor_longitude as visitor_lon,
    a.latitude as anr_lat,
    a.longitude as anr_lon,
    -- Haversine formula approximation
    (6371000 * 2 * asin(sqrt(
      power(sin(radians((cl.visitor_latitude - a.latitude) / 2)), 2) +
      cos(radians(a.latitude)) * cos(radians(cl.visitor_latitude)) *
      power(sin(radians((cl.visitor_longitude - a.longitude) / 2)), 2)
    )))::NUMERIC as distance_m,
    COALESCE(a.max_gps_update_distance, (SELECT max_distance FROM config)) as max_distance_m,
    cl.started_at as call_started_at
  FROM call_logs cl
  JOIN habitations h ON h.id = cl.habitation_id
  JOIN anrs a ON a.id = h.anr_id
  CROSS JOIN config
  WHERE cl.visitor_latitude IS NOT NULL 
    AND cl.visitor_longitude IS NOT NULL
    AND cl.started_at > now() - interval '24 hours'
    AND (6371000 * 2 * asin(sqrt(
      power(sin(radians((cl.visitor_latitude - a.latitude) / 2)), 2) +
      cos(radians(a.latitude)) * cos(radians(cl.visitor_latitude)) *
      power(sin(radians((cl.visitor_longitude - a.longitude) / 2)), 2)
    ))) > COALESCE(a.max_gps_update_distance, (SELECT max_distance FROM config))
    AND NOT EXISTS (
      SELECT 1 FROM security_anomalies sa 
      WHERE sa.call_id = cl.id AND sa.anomaly_type = 'gps_distance_exceeded'
    )
$$;

-- Fonction pour détecter les appels trop longs
CREATE OR REPLACE FUNCTION detect_call_duration_anomalies()
RETURNS TABLE(
  call_id UUID,
  habitation_id UUID,
  duration_seconds INTEGER,
  max_duration_seconds INTEGER,
  call_started_at TIMESTAMPTZ,
  call_ended_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH config AS (
    SELECT COALESCE((value::TEXT)::INTEGER, 300) as max_duration
    FROM app_config WHERE key = 'max_call_duration_seconds'
    LIMIT 1
  )
  SELECT 
    cl.id as call_id,
    cl.habitation_id,
    EXTRACT(EPOCH FROM (cl.ended_at - cl.started_at))::INTEGER as duration_seconds,
    (SELECT max_duration FROM config) as max_duration_seconds,
    cl.started_at as call_started_at,
    cl.ended_at as call_ended_at
  FROM call_logs cl
  CROSS JOIN config
  WHERE cl.ended_at IS NOT NULL
    AND cl.started_at IS NOT NULL
    AND cl.ended_at > now() - interval '24 hours'
    AND EXTRACT(EPOCH FROM (cl.ended_at - cl.started_at)) > (SELECT max_duration FROM config)
    AND NOT EXISTS (
      SELECT 1 FROM security_anomalies sa 
      WHERE sa.call_id = cl.id AND sa.anomaly_type = 'call_duration_exceeded'
    )
$$;