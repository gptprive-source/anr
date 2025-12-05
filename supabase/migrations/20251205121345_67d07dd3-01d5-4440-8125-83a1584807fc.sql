-- 1. Supprimer le rôle admin de Ilyes AMINI
DELETE FROM user_roles WHERE user_id = '32e2ecfe-0b57-4455-9d79-85e965c32a5d';

-- 2. Ajouter politique RLS pour permettre aux résidents de se retirer eux-mêmes
CREATE POLICY "Users can delete themselves from residents"
ON public.residents
FOR DELETE
USING (user_id = auth.uid());