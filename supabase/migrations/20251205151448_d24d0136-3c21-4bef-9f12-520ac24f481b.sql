-- 1. Politique RESTRICTIVE sur profiles : exige authentification pour toute opération
CREATE POLICY "Require authentication for all profile operations"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);

-- 2. Révoquer toutes les permissions du rôle anon sur profiles
REVOKE ALL ON public.profiles FROM anon;

-- 3. Politique RESTRICTIVE sur phone_verifications : exige authentification
CREATE POLICY "Require authentication for phone verifications"
ON public.phone_verifications
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);

-- 4. Révoquer toutes les permissions du rôle anon sur phone_verifications
REVOKE ALL ON public.phone_verifications FROM anon;