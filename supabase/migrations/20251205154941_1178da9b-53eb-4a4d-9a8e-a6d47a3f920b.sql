-- Table pour stocker les exécutions d'audit
CREATE TABLE public.security_audit_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  total_issues INTEGER DEFAULT 0,
  critical_issues INTEGER DEFAULT 0,
  warning_issues INTEGER DEFAULT 0,
  triggered_by UUID REFERENCES auth.users(id),
  trigger_type TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'scheduled'))
);

-- Table pour stocker les résultats d'audit
CREATE TABLE public.security_audit_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.security_audit_runs(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  table_name TEXT,
  policy_name TEXT,
  description TEXT NOT NULL,
  recommendation TEXT,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.security_audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_results ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour security_audit_runs
CREATE POLICY "Admins can view audit runs"
ON public.security_audit_runs FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can insert audit runs"
ON public.security_audit_runs FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update audit runs"
ON public.security_audit_runs FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Politiques RLS pour security_audit_results
CREATE POLICY "Admins can view audit results"
ON public.security_audit_results FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can insert audit results"
ON public.security_audit_results FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update audit results"
ON public.security_audit_results FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Fonction pour récupérer les tables sans RLS activé
CREATE OR REPLACE FUNCTION public.get_tables_without_rls()
RETURNS TABLE(table_name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.relname::TEXT as table_name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND NOT c.relrowsecurity
    AND c.relname NOT LIKE 'pg_%'
    AND c.relname NOT LIKE '_%;'
$$;

-- Fonction pour récupérer les tables avec RLS mais sans politiques
CREATE OR REPLACE FUNCTION public.get_tables_without_policies()
RETURNS TABLE(table_name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.relname::TEXT as table_name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = true
    AND NOT EXISTS (
      SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid
    )
$$;

-- Fonction pour récupérer les politiques trop permissives
CREATE OR REPLACE FUNCTION public.get_permissive_policies()
RETURNS TABLE(table_name TEXT, policy_name TEXT, policy_qual TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.relname::TEXT as table_name,
    p.polname::TEXT as policy_name,
    pg_get_expr(p.polqual, p.polrelid)::TEXT as policy_qual
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND (
      pg_get_expr(p.polqual, p.polrelid) = 'true'
      OR pg_get_expr(p.polwithcheck, p.polrelid) = 'true'
    )
$$;

-- Index pour améliorer les performances
CREATE INDEX idx_security_audit_results_run_id ON public.security_audit_results(run_id);
CREATE INDEX idx_security_audit_results_severity ON public.security_audit_results(severity);
CREATE INDEX idx_security_audit_runs_status ON public.security_audit_runs(status);