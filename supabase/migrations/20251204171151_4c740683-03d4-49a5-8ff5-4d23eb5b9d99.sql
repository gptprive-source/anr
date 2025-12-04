-- Add CGU content to app_config
INSERT INTO public.app_config (key, value, description, category)
VALUES (
  'cgu_content',
  '"# Conditions Générales d''Utilisation\n\n## Article 1 - Objet\n\nLes présentes Conditions Générales d''Utilisation (CGU) régissent l''utilisation du service ANR (Adresse Numérique Résidentielle).\n\n## Article 2 - Description du service\n\nANR est un service d''interphone numérique permettant aux résidents de recevoir des appels de visiteurs via une adresse numérique unique.\n\n## Article 3 - Inscription et compte\n\nL''utilisateur s''engage à fournir des informations exactes lors de son inscription. Il est responsable de la confidentialité de ses identifiants.\n\n## Article 4 - Abonnement et paiement\n\nL''abonnement est facturé annuellement au tarif en vigueur. La reconduction est tacite sauf résiliation avant échéance.\n\n## Article 5 - Utilisation du service\n\nL''utilisateur s''engage à utiliser le service conformément à sa destination et à ne pas en faire un usage abusif.\n\n## Article 6 - Données personnelles\n\nLes données personnelles sont traitées conformément à notre politique de confidentialité et au RGPD.\n\n## Article 7 - Responsabilité\n\nANR ne saurait être tenu responsable des interruptions de service indépendantes de sa volonté.\n\n## Article 8 - Modification des CGU\n\nANR se réserve le droit de modifier les présentes CGU. Les utilisateurs seront informés de toute modification.\n\n## Article 9 - Droit applicable\n\nLes présentes CGU sont soumises au droit français."',
  'Contenu des Conditions Générales d''Utilisation (format Markdown)',
  'content'
) ON CONFLICT (key) DO NOTHING;

-- Add CGU last update date
INSERT INTO public.app_config (key, value, description, category)
VALUES (
  'cgu_last_updated',
  '"2024-12-04"',
  'Date de dernière mise à jour des CGU',
  'content'
) ON CONFLICT (key) DO NOTHING;