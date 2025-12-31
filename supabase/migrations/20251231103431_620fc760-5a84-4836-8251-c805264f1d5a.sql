-- Reset phone verification for testing
UPDATE profiles 
SET phone_verified = false, device_id = NULL 
WHERE id = '1eaf3a87-03ff-4c97-acf1-f714cc8959d1';