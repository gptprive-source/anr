-- Ajouter les champs pour la carte de visite
ALTER TABLE visitor_business_cards 
ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS anr_code TEXT;

-- Ajouter le champ de complétion dans profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS business_card_completed BOOLEAN DEFAULT false;

-- Index pour améliorer les recherches par anr_code
CREATE INDEX IF NOT EXISTS idx_visitor_business_cards_anr_code ON visitor_business_cards(anr_code);

-- Index pour les recherches de cartes incomplètes
CREATE INDEX IF NOT EXISTS idx_profiles_business_card_completed ON profiles(business_card_completed) WHERE business_card_completed = false;