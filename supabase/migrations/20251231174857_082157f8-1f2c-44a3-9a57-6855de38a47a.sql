-- Reset business card status for enseigneprod@gmail.com to test the mandatory flow
UPDATE profiles 
SET business_card_completed = false 
WHERE id = '43b93a78-a013-49fe-92a5-40da30616161';

-- Delete auto-created business cards for this user
DELETE FROM visitor_business_cards 
WHERE user_id = '43b93a78-a013-49fe-92a5-40da30616161';