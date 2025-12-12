-- Add MESSAGERIE section to FAQ
INSERT INTO public.faq_sections (name, icon, sort_order, is_active)
VALUES ('MESSAGERIE', 'MessageSquare', 6, true);

-- Add FAQ items for MESSAGERIE section
INSERT INTO public.faq_items (section, question, answer, sort_order, is_active)
VALUES 
  ('MESSAGERIE', 'Qu''est-ce que la messagerie ANR ?', 'La messagerie ANR vous permet d''échanger des messages chiffrés avec vos visiteurs. Vous pouvez envoyer et recevoir des messages texte, vocaux et vidéos directement dans l''application, sans avoir besoin de partager votre numéro de téléphone.', 1, true),
  
  ('MESSAGERIE', 'Comment fonctionne le chiffrement de bout en bout (E2E) ?', 'Tous vos messages sont protégés par un chiffrement de bout en bout utilisant les algorithmes cryptographiques les plus robustes : **ECDH P-256** pour l''échange de clés et **AES-256-GCM** pour le chiffrement des messages. Concrètement, cela signifie que vos messages sont chiffrés sur votre appareil avant d''être envoyés, et seul votre correspondant possède la clé pour les déchiffrer. **Même ANR, ses serveurs ou ses employés ne peuvent jamais lire le contenu de vos messages.** Les clés de chiffrement sont générées localement sur chaque appareil et ne quittent jamais votre téléphone.', 2, true),
  
  ('MESSAGERIE', 'Puis-je envoyer des pièces jointes et fichiers ?', 'Oui, vous pouvez envoyer des pièces jointes avec vos messages : photos, documents PDF, fichiers audio et vidéos. Tous les fichiers sont également chiffrés de bout en bout avant l''envoi, garantissant la même confidentialité que pour les messages texte.', 3, true),
  
  ('MESSAGERIE', 'Comment envoyer un message à un visiteur ?', 'Quand un visiteur vous contacte via votre ANR, il peut laisser un message texte, vocal ou vidéo. Vous pouvez lui répondre directement depuis la page Messages de l''application. Tous vos échanges sont conservés dans un fil de conversation dédié.', 4, true),
  
  ('MESSAGERIE', 'Puis-je bloquer un visiteur indésirable ?', 'Oui, vous pouvez bloquer n''importe quel visiteur depuis la page de conversation. Les visiteurs bloqués ne pourront plus vous envoyer de messages. Vous pouvez les débloquer à tout moment si vous changez d''avis.', 5, true),
  
  ('MESSAGERIE', 'Puis-je sauvegarder mes messages ?', 'Oui, vous pouvez sauvegarder vos messages de façon chiffrée localement ou sur Google Drive depuis la page "Sauvegarde des messages" dans votre compte. Vos sauvegardes sont protégées par un mot de passe personnel que vous seul connaissez.', 6, true);