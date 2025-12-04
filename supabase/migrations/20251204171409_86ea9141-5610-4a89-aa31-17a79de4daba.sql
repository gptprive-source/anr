-- Add Privacy Policy content to app_config
INSERT INTO public.app_config (key, value, description, category)
VALUES (
  'privacy_policy_content',
  '"# Politique de Confidentialité\n\n## Article 1 - Responsable du traitement\n\nLe responsable du traitement des données personnelles est ANR (Adresse Numérique Résidentielle).\n\n## Article 2 - Données collectées\n\nNous collectons les données suivantes :\n- Nom et prénom\n- Adresse email\n- Numéro de téléphone\n- Adresse postale\n- Coordonnées GPS de l''habitation\n\n## Article 3 - Finalité du traitement\n\nLes données sont collectées pour :\n- La création et gestion de votre compte\n- Le fonctionnement du service d''interphone numérique\n- L''envoi de notifications d''appels entrants\n- La facturation de l''abonnement\n\n## Article 4 - Base légale\n\nLe traitement est fondé sur l''exécution du contrat de service et votre consentement explicite.\n\n## Article 5 - Durée de conservation\n\nVos données sont conservées pendant la durée de votre abonnement et 3 ans après sa résiliation pour des raisons légales.\n\n## Article 6 - Destinataires des données\n\nVos données peuvent être transmises à :\n- Nos prestataires techniques (hébergement, paiement)\n- Les autorités compétentes sur demande légale\n\n## Article 7 - Vos droits\n\nConformément au RGPD, vous disposez des droits suivants :\n- Droit d''accès à vos données\n- Droit de rectification\n- Droit à l''effacement\n- Droit à la portabilité\n- Droit d''opposition\n- Droit de limitation du traitement\n\nPour exercer ces droits, contactez-nous à l''adresse indiquée ci-dessous.\n\n## Article 8 - Sécurité\n\nNous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données contre tout accès non autorisé.\n\n## Article 9 - Cookies\n\nNotre application utilise des cookies techniques essentiels au fonctionnement du service. Aucun cookie publicitaire n''est utilisé.\n\n## Article 10 - Contact\n\nPour toute question relative à vos données personnelles, contactez notre Délégué à la Protection des Données."',
  'Contenu de la Politique de Confidentialité (format Markdown)',
  'content'
) ON CONFLICT (key) DO NOTHING;

-- Add Privacy Policy last update date
INSERT INTO public.app_config (key, value, description, category)
VALUES (
  'privacy_policy_last_updated',
  '"2024-12-04"',
  'Date de dernière mise à jour de la Politique de Confidentialité',
  'content'
) ON CONFLICT (key) DO NOTHING;