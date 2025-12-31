-- Nettoyage précis des données orphelines de test
-- D'abord supprimer les subscriptions orphelines (sans résident associé)
DELETE FROM subscriptions s
WHERE NOT EXISTS (
  SELECT 1 FROM residents r WHERE r.habitation_id = s.habitation_id
);

-- Ensuite supprimer les habitations orphelines (sans résidents)
DELETE FROM habitations h
WHERE NOT EXISTS (
  SELECT 1 FROM residents r WHERE r.habitation_id = h.id
);

-- Supprimer le profil orphelin si existe
DELETE FROM profiles WHERE id = '9723f853-07d4-46e5-a9b0-e546a7de0382';