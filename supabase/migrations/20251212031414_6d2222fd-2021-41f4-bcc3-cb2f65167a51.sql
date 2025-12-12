
-- Supprimer les données de Hassane pour refaire le test d'affiliation
-- Ordre corrigé pour respecter les contraintes FK

-- 1. Supprimer les commandes de doming
DELETE FROM doming_orders WHERE user_id = '20f64c8f-82a7-44f6-8d8c-7910ac40b5c4';

-- 2. Supprimer le resident
DELETE FROM residents WHERE user_id = '20f64c8f-82a7-44f6-8d8c-7910ac40b5c4';

-- 3. Supprimer la subscription AVANT l'habitation
DELETE FROM subscriptions WHERE user_id = '20f64c8f-82a7-44f6-8d8c-7910ac40b5c4';

-- 4. Supprimer l'habitation
DELETE FROM habitations WHERE id = '6dfe2003-09a7-41d1-9bc6-7bc51f4b4022';

-- 5. Supprimer l'ANR (seulement si pas d'autres habitations liées)
DELETE FROM anrs WHERE id = 'f27d6025-6391-4eb0-8b80-d48c005e5588' 
  AND NOT EXISTS (SELECT 1 FROM habitations WHERE anr_id = 'f27d6025-6391-4eb0-8b80-d48c005e5588');

-- 6. Supprimer le profil
DELETE FROM profiles WHERE id = '20f64c8f-82a7-44f6-8d8c-7910ac40b5c4';
