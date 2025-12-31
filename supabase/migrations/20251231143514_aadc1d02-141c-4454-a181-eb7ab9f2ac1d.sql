-- Attribuer le rôle super_admin à khalidamini@gmail.com
-- Cette migration s'exécutera après votre réinscription

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM auth.users
WHERE email = 'khalidamini@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;