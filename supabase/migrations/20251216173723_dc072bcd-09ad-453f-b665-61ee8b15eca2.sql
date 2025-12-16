-- 1. Nettoyer les resident_contacts avec des visitor_anr_codes (format ANR-XXXXXXXX)
UPDATE public.resident_contacts 
SET anr_code = NULL 
WHERE anr_code ~ '^ANR-[A-Z0-9]{8}$';

-- 2. Supprimer la colonne visitor_anr_code de visitor_business_cards
ALTER TABLE public.visitor_business_cards 
DROP COLUMN IF EXISTS visitor_anr_code;