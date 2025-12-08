-- Insert predefined Co-Pilot guides with correct difficulty values
INSERT INTO public.assistant_guides (guide_key, name, description, category, difficulty, estimated_duration_seconds, steps, trigger_paths, trigger_actions, required_plan, sort_order, is_active)
VALUES
-- Guides résidents
('schedule_nanny_access', 'Programmer un accès pour la nounou', 'Guide pas à pas pour créer une autorisation d''accès programmé pour votre nounou ou aide à domicile', 'door_access', 'easy', 180, 
 '[{"step": 1, "title": "Accéder aux accès porte", "description": "Cliquez sur l''onglet Accès porte dans le menu du bas", "target": "bottom-nav-door-access"}, {"step": 2, "title": "Créer un nouvel accès", "description": "Cliquez sur le bouton + Nouvel accès programmé", "target": "create-scheduled-access-btn"}, {"step": 3, "title": "Renseigner les informations", "description": "Entrez le prénom, nom et code ANR du bénéficiaire", "target": "scheduled-access-form"}, {"step": 4, "title": "Définir les horaires", "description": "Sélectionnez les jours et heures d''accès autorisés", "target": "schedule-time-selector"}, {"step": 5, "title": "Valider", "description": "Cliquez sur Enregistrer pour activer l''accès", "target": "save-scheduled-access-btn"}]'::jsonb,
 ARRAY['/door-access', '/dashboard'], ARRAY['create_scheduled_access'], NULL, 1, true),

('invite_resident', 'Inviter un résident', 'Ajouter un membre de votre foyer pour qu''il reçoive aussi les appels interphone', 'residents', 'easy', 120,
 '[{"step": 1, "title": "Accéder au tableau de bord", "description": "Allez sur votre tableau de bord principal", "target": "dashboard-link"}, {"step": 2, "title": "Section résidents", "description": "Trouvez la section Résidents sur votre tableau de bord", "target": "residents-section"}, {"step": 3, "title": "Inviter", "description": "Cliquez sur le bouton Inviter un résident", "target": "invite-resident-btn"}, {"step": 4, "title": "Remplir le formulaire", "description": "Entrez le prénom, nom et email du résident à inviter", "target": "invite-resident-form"}, {"step": 5, "title": "Envoyer", "description": "Cliquez sur Envoyer l''invitation", "target": "send-invitation-btn"}]'::jsonb,
 ARRAY['/dashboard', '/residents'], ARRAY['invite_resident'], NULL, 2, true),

('share_anr_code', 'Partager votre code ANR', 'Partagez votre code ANR pour que les visiteurs puissent vous appeler', 'anr', 'easy', 60,
 '[{"step": 1, "title": "Tableau de bord", "description": "Accédez à votre tableau de bord", "target": "dashboard-link"}, {"step": 2, "title": "Code ANR", "description": "Repérez votre code ANR affiché en haut", "target": "anr-code-display"}, {"step": 3, "title": "Partager", "description": "Cliquez sur le bouton de partage pour copier ou envoyer le lien", "target": "share-anr-btn"}]'::jsonb,
 ARRAY['/dashboard'], ARRAY['share_anr'], NULL, 3, true),

('manage_visitor_messages', 'Gérer les messages visiteurs', 'Consulter et répondre aux messages laissés par les visiteurs', 'messages', 'easy', 90,
 '[{"step": 1, "title": "Accéder aux messages", "description": "Cliquez sur Messages dans le menu ou sur la notification", "target": "messages-link"}, {"step": 2, "title": "Consulter", "description": "Parcourez la liste des messages reçus", "target": "messages-list"}, {"step": 3, "title": "Écouter/Lire", "description": "Cliquez sur un message pour le lire ou écouter le vocal", "target": "message-item"}, {"step": 4, "title": "Supprimer", "description": "Utilisez le bouton supprimer pour effacer les messages traités", "target": "delete-message-btn"}]'::jsonb,
 ARRAY['/messages', '/dashboard'], ARRAY['view_messages'], NULL, 4, true),

('instant_door_access', 'Ouvrir la porte instantanément', 'Ouvrir votre porte à distance via Bluetooth', 'door_access', 'easy', 45,
 '[{"step": 1, "title": "Accès porte", "description": "Allez dans la section Accès porte", "target": "door-access-link"}, {"step": 2, "title": "Connexion Bluetooth", "description": "Assurez-vous d''être à proximité et connecté au module", "target": "ble-status"}, {"step": 3, "title": "Ouvrir", "description": "Appuyez sur le bouton Ouvrir la porte", "target": "open-door-btn"}]'::jsonb,
 ARRAY['/door-access'], ARRAY['open_door'], NULL, 5, true),

-- Guides PRO
('add_employee', 'Ajouter un employé', 'Enregistrer un nouvel employé dans votre entreprise', 'pro_employees', 'easy', 120,
 '[{"step": 1, "title": "Dashboard PRO", "description": "Accédez à votre espace PRO", "target": "pro-dashboard-link"}, {"step": 2, "title": "Liste employés", "description": "Allez dans la section Employés", "target": "employees-section"}, {"step": 3, "title": "Ajouter", "description": "Cliquez sur Ajouter un employé", "target": "add-employee-btn"}, {"step": 4, "title": "Informations", "description": "Remplissez les informations de l''employé", "target": "employee-form"}, {"step": 5, "title": "Enregistrer", "description": "Validez pour créer le profil employé", "target": "save-employee-btn"}]'::jsonb,
 ARRAY['/pro'], ARRAY['add_employee'], ARRAY['pro', 'enterprise', 'collectivites'], 10, true),

('assign_mission', 'Affecter une mission', 'Assigner un employé à une intervention client', 'pro_missions', 'medium', 180,
 '[{"step": 1, "title": "Planning", "description": "Accédez à la section Planning/Missions", "target": "planning-section"}, {"step": 2, "title": "Nouvelle mission", "description": "Cliquez sur Nouvelle affectation", "target": "new-assignment-btn"}, {"step": 3, "title": "Sélectionner employé", "description": "Choisissez l''employé à affecter", "target": "employee-selector"}, {"step": 4, "title": "Choisir client", "description": "Sélectionnez l''autorisation/client concerné", "target": "schedule-selector"}, {"step": 5, "title": "Date et horaires", "description": "Définissez la date et les horaires de mission", "target": "date-time-picker"}, {"step": 6, "title": "Valider", "description": "Confirmez l''affectation", "target": "confirm-assignment-btn"}]'::jsonb,
 ARRAY['/pro'], ARRAY['assign_mission'], ARRAY['pro', 'enterprise', 'collectivites'], 11, true),

('generate_report', 'Générer un rapport d''horodatage', 'Exporter les données d''entrées/sorties de vos employés', 'pro_reports', 'medium', 150,
 '[{"step": 1, "title": "Rapports", "description": "Accédez à la section Rapports", "target": "reports-section"}, {"step": 2, "title": "Période", "description": "Sélectionnez la période souhaitée", "target": "date-range-picker"}, {"step": 3, "title": "Filtres", "description": "Filtrez par employé ou client si besoin", "target": "report-filters"}, {"step": 4, "title": "Générer", "description": "Cliquez sur Générer le rapport", "target": "generate-report-btn"}, {"step": 5, "title": "Exporter", "description": "Téléchargez en PDF ou CSV", "target": "export-btn"}]'::jsonb,
 ARRAY['/pro'], ARRAY['generate_report'], ARRAY['pro', 'enterprise', 'collectivites'], 12, true),

('setup_face_recognition', 'Configurer la reconnaissance faciale', 'Activer la reconnaissance faciale pour les entrées/sorties employés', 'pro_security', 'medium', 240,
 '[{"step": 1, "title": "Paramètres entreprise", "description": "Accédez aux paramètres de votre entreprise", "target": "company-settings"}, {"step": 2, "title": "Sécurité", "description": "Allez dans l''onglet Sécurité", "target": "security-tab"}, {"step": 3, "title": "Activer", "description": "Activez l''option Reconnaissance faciale", "target": "face-recognition-toggle"}, {"step": 4, "title": "Employés", "description": "Chaque employé devra ensuite enregistrer son visage", "target": "employee-face-setup"}]'::jsonb,
 ARRAY['/pro'], ARRAY['setup_face_recognition'], ARRAY['enterprise', 'collectivites'], 13, true),

('configure_geofencing', 'Configurer le géofencing', 'Définir les zones autorisées pour vos employés', 'pro_security', 'medium', 300,
 '[{"step": 1, "title": "Paramètres", "description": "Accédez aux paramètres entreprise", "target": "company-settings"}, {"step": 2, "title": "Géofencing", "description": "Activez l''option Géofencing", "target": "geofencing-toggle"}, {"step": 3, "title": "Rayon", "description": "Définissez le rayon autorisé autour des clients", "target": "geofencing-radius"}, {"step": 4, "title": "Alertes", "description": "Configurez les alertes de sortie de zone", "target": "geofencing-alerts"}]'::jsonb,
 ARRAY['/pro'], ARRAY['configure_geofencing'], ARRAY['enterprise', 'collectivites'], 14, true);