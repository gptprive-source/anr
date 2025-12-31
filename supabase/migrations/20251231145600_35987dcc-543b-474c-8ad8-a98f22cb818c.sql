-- Attribuer le rôle super_admin à aminikhalid@gmail.com
INSERT INTO user_roles (user_id, role)
SELECT id, 'super_admin'
FROM auth.users
WHERE email = 'aminikhalid@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;