-- Update FAQ items with dynamic variables
UPDATE faq_items SET answer = 'L''abonnement à l''interphone numérique coûte {{subscription_price}}€ par an avec reconduction tacite. Vous pouvez résilier à tout moment depuis votre espace client.' WHERE id = '23f7e543-f8ea-4a45-bc46-2450e4df86e8';

UPDATE faq_items SET answer = 'Le Doming est le badge physique contenant votre QR code, puce NFC et numéro ANR. Un Doming gratuit est inclus lors de la création d''une nouvelle ANR. Les Domings supplémentaires coûtent {{doming_price}}€ pièce.' WHERE id = '2e905b01-2fdd-4b17-9fdd-b30588932ed5';

UPDATE faq_items SET answer = 'L''interphone numérique est un service d''abonnement ({{subscription_price}}€/an) qui permet aux visiteurs de vous appeler via l''ANR de votre habitation. Quand un visiteur scanne votre ANR, vous recevez un appel vidéo sur votre téléphone, où que vous soyez.' WHERE id = 'e51b664d-dd64-4e68-8029-7efd4617a6f0';

UPDATE faq_items SET answer = 'Jusqu''à {{max_residents_per_habitation}} résidents peuvent être liés à une même habitation : 1 résident principal (propriétaire du compte) et jusqu''à 6 résidents invités.' WHERE id = 'a464600b-ef36-4d6c-b558-419de7001ef0';

UPDATE faq_items SET answer = 'Depuis votre tableau de bord, cliquez sur "Inviter un résident". Entrez son email, prénom et nom. Il recevra un lien d''invitation valable {{invitation_validity_hours}} heures pour créer son compte et rejoindre votre habitation.' WHERE id = '929d25bf-e2eb-4b26-9be1-781b7d2a090c';

UPDATE faq_items SET answer = 'Pour éviter les appels frauduleux, le visiteur doit se trouver à moins de {{max_distance_meters}} mètres de la position GPS de l''ANR. Au-delà, l''interphone ne fonctionne pas.' WHERE id = 'e0b01bf9-e198-4187-984d-c334b0b91cc0';

UPDATE faq_items SET answer = 'Les appels sont limités à {{max_call_duration_minutes}} minutes maximum pour garantir une utilisation raisonnable du service.' WHERE id = 'ffa03e7c-7350-4c6e-8ae7-71d21a1b95cf';