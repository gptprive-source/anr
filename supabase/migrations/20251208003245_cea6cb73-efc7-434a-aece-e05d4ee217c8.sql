-- ============================================
-- CORRECTION DES FAILLES DE SÉCURITÉ - PARTIE 2
-- ============================================

-- 1. SUPPRIMER TOUTES LES POLITIQUES EXISTANTES SUR PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view co-residents profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Recréer les politiques restrictives pour profiles
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can view co-residents profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT r2.user_id FROM residents r1
    JOIN residents r2 ON r1.habitation_id = r2.habitation_id
    WHERE r1.user_id = auth.uid() AND r1.status = 'verified'
  )
);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Service role pour les edge functions
CREATE POLICY "Service can manage profiles"
ON public.profiles FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2. RÉVOQUER L'ACCÈS ANON
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.phone_verifications FROM anon;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.phone_verifications TO authenticated;