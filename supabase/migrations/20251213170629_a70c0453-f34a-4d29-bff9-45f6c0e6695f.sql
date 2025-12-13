-- Créer des visitor_business_cards pour tous les utilisateurs existants qui n'en ont pas
INSERT INTO visitor_business_cards (user_id, device_id, first_name, last_name, card_type, visitor_anr_code)
SELECT 
  p.id as user_id,
  gen_random_uuid()::text as device_id,
  COALESCE(p.first_name, 'Utilisateur') as first_name,
  COALESCE(p.last_name, '') as last_name,
  'individual' as card_type,
  'ANR-' || UPPER(SUBSTRING(MD5(p.id::text || RANDOM()::text) FROM 1 FOR 8)) as visitor_anr_code
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM visitor_business_cards vbc WHERE vbc.user_id = p.id
)
AND p.id IS NOT NULL;