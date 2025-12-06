-- Registre RGPD avec valeurs valides (legitimate_interest, consent, contract)
INSERT INTO rgpd_data_processing_registry (
  name, purpose, legal_basis, data_categories, recipients, retention_period, is_active
) VALUES 
(
  'Messages visiteurs',
  'Permettre aux visiteurs de laisser des messages écrits aux résidents',
  'legitimate_interest',
  ARRAY['Message texte', 'Numéro de téléphone (optionnel)'],
  ARRAY['Résidents de l''habitation'],
  '30 jours',
  true
),
(
  'Cartes de visite visiteurs',
  'Permettre aux visiteurs de créer et partager leurs coordonnées avec les résidents',
  'consent',
  ARRAY['Nom', 'Prénom', 'Société', 'Téléphone', 'Email', 'Code ANR'],
  ARRAY['Résidents de l''habitation contactée'],
  '365 jours',
  true
);