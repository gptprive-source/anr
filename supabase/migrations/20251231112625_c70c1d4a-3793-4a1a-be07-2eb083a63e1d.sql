
-- Débloquer le compte de Khadija Oukhrid
UPDATE profiles 
SET phone_verified = true, device_id = 'bypass-unlock-' || gen_random_uuid()::text
WHERE id = 'b581d9f4-064f-418f-aeab-6f17af243e6b';
