-- Update CGU with E2E encryption section (value is JSONB so we use to_jsonb)
UPDATE app_config 
SET value = to_jsonb('# Conditions Générales d''Utilisation

## Article 1 - Objet

Les présentes Conditions Générales d''Utilisation (CGU) régissent l''utilisation du service ANR (Adresse Numérique Résidentielle).

## Article 2 - Description du service

ANR est un service d''interphone numérique permettant aux résidents de recevoir des appels de visiteurs via une adresse numérique unique.

## Article 3 - Inscription et compte

L''utilisateur s''engage à fournir des informations exactes lors de son inscription. Il est responsable de la confidentialité de ses identifiants.

## Article 4 - Abonnement et paiement

L''abonnement est facturé annuellement au tarif en vigueur. La reconduction est tacite sauf résiliation avant échéance.

## Article 5 - Utilisation du service

L''utilisateur s''engage à utiliser le service conformément à sa destination et à ne pas en faire un usage abusif.

## Article 6 - Données personnelles

Les données personnelles sont traitées conformément à notre politique de confidentialité et au RGPD.

## Article 7 - Sécurité des communications

### 7.1 - Chiffrement de bout en bout

Tous les messages échangés entre visiteurs et résidents sont protégés par un chiffrement de bout en bout (E2E). Ce chiffrement garantit que :
- Seuls l''expéditeur et le destinataire peuvent lire le contenu des messages
- ANR n''a pas accès au contenu des messages chiffrés
- Aucun tiers ne peut intercepter ou lire les communications

### 7.2 - Technologie de chiffrement

Le chiffrement utilise les algorithmes suivants :
- ECDH (Elliptic Curve Diffie-Hellman) avec courbe P-256 pour l''échange de clés
- AES-256-GCM pour le chiffrement symétrique des messages
- Nonces uniques pour chaque message empêchant les attaques par rejeu

### 7.3 - Gestion des clés

Les clés privées sont générées et stockées localement sur l''appareil de l''utilisateur. En cas de perte de l''appareil ou de suppression des données du navigateur, les messages précédemment chiffrés ne pourront pas être récupérés.

### 7.4 - Indicateur de chiffrement

Un indicateur visuel signale les messages protégés par le chiffrement de bout en bout.

## Article 8 - Responsabilité

ANR ne saurait être tenu responsable des interruptions de service indépendantes de sa volonté.

## Article 9 - Modification des CGU

ANR se réserve le droit de modifier les présentes CGU. Les utilisateurs seront informés de toute modification.

## Article 10 - Droit applicable

Les présentes CGU sont soumises au droit français.'::text),
    updated_at = now()
WHERE key = 'cgu_content';

-- Update CGU last updated date
UPDATE app_config 
SET value = to_jsonb(CURRENT_DATE::text),
    updated_at = now()
WHERE key = 'cgu_last_updated';

-- Update Privacy Policy with E2E encryption section
UPDATE app_config 
SET value = to_jsonb('# Politique de Confidentialité

## Article 1 - Responsable du traitement

Le responsable du traitement des données personnelles est ANR (Adresse Numérique Résidentielle).

## Article 2 - Données collectées

Nous collectons les données suivantes :
- Nom et prénom
- Adresse email
- Numéro de téléphone
- Adresse postale
- Coordonnées GPS de l''habitation

## Article 3 - Finalité du traitement

Les données sont collectées pour :
- La création et gestion de votre compte
- Le fonctionnement du service d''interphone numérique
- L''envoi de notifications d''appels entrants
- La facturation de l''abonnement

## Article 4 - Base légale

Le traitement est fondé sur l''exécution du contrat de service et votre consentement explicite.

## Article 5 - Durée de conservation

Vos données sont conservées pendant la durée de votre abonnement et 3 ans après sa résiliation pour des raisons légales.

## Article 6 - Destinataires des données

Vos données peuvent être transmises à :
- Nos prestataires techniques (hébergement, paiement)
- Les autorités compétentes sur demande légale

## Article 7 - Vos droits

Conformément au RGPD, vous disposez des droits suivants :
- Droit d''accès à vos données
- Droit de rectification
- Droit à l''effacement
- Droit à la portabilité
- Droit d''opposition
- Droit de limitation du traitement

Pour exercer ces droits, contactez-nous.

## Article 8 - Sécurité des données

### 8.1 - Mesures générales

Nous mettons en oeuvre des mesures techniques et organisationnelles pour protéger vos données contre tout accès non autorisé.

### 8.2 - Chiffrement de bout en bout (E2E)

Les messages échangés entre visiteurs et résidents sont protégés par un chiffrement de bout en bout utilisant :
- ECDH P-256 : Protocole d''échange de clés basé sur les courbes elliptiques
- AES-256-GCM : Chiffrement symétrique authentifié de niveau militaire
- Nonces uniques : Prévention des attaques par rejeu

### 8.3 - Garanties du chiffrement E2E

- ANR ne peut PAS lire le contenu de vos messages chiffrés
- Les clés privées ne quittent jamais votre appareil
- Aucune porte dérobée (backdoor) n''existe dans le système
- La conformité RGPD est assurée par design (privacy by design)

### 8.4 - Stockage des clés

Les clés cryptographiques sont :
- Générées localement via l''API Web Crypto du navigateur
- Stockées dans le stockage local de votre navigateur
- Jamais transmises ni stockées sur nos serveurs

### 8.5 - Avertissement important

En cas de perte ou suppression des données de votre navigateur, vos clés privées seront perdues et les messages chiffrés ne pourront pas être déchiffrés.

## Article 9 - Cookies

Notre application utilise des cookies techniques essentiels au fonctionnement du service. Aucun cookie publicitaire n''est utilisé.

## Article 10 - Contact

Pour toute question relative à vos données personnelles, contactez notre Délégué à la Protection des Données.'::text),
    updated_at = now()
WHERE key = 'privacy_policy_content';

-- Update Privacy Policy last updated date  
UPDATE app_config 
SET value = to_jsonb(CURRENT_DATE::text),
    updated_at = now()
WHERE key = 'privacy_policy_last_updated';