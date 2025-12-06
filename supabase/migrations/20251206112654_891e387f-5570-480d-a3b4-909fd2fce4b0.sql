-- Entrée registre RGPD avec legal_basis valide
INSERT INTO public.rgpd_data_processing_registry (
  name, purpose, data_categories, legal_basis, retention_period, recipients, is_active
) VALUES (
  'Messages visiteurs',
  'Permettre aux visiteurs de laisser des messages écrits aux résidents en cas d''absence',
  ARRAY['Message texte', 'Numéro de téléphone (optionnel)', 'Horodatage'],
  'legitimate_interest',
  '30 jours (configurable)',
  ARRAY['Résidents de l''habitation concernée uniquement'],
  true
);