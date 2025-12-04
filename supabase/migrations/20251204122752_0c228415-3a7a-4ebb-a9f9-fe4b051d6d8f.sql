-- Supprimer les residents des habitations en double (garder uniquement le plus récent)
DELETE FROM residents WHERE habitation_id IN (
  '80f04862-1b90-4e9d-ab0b-80cd94caca5d',
  '1282ded5-1a79-47bb-a91a-46dd8a245a97',
  '7e6b0033-9267-47b1-9513-d4d93dcd9ec2',
  '1cc8a92e-e35f-4272-bdb5-970750fa2d1a'
);

-- Supprimer les habitations en double
DELETE FROM habitations WHERE id IN (
  '80f04862-1b90-4e9d-ab0b-80cd94caca5d',
  '1282ded5-1a79-47bb-a91a-46dd8a245a97',
  '7e6b0033-9267-47b1-9513-d4d93dcd9ec2',
  '1cc8a92e-e35f-4272-bdb5-970750fa2d1a'
);

-- Supprimer les ANRs en double
DELETE FROM anrs WHERE id IN (
  'c4786d1a-be0f-443f-9b3a-e0da70b2ac8b',
  'f69b7993-826b-436d-98ac-08b0e7105a19',
  '9e7c8e2e-9d19-4109-8349-66263515826a',
  '764aa4de-e55f-4140-b2d6-a5181fb8d46b'
);