UPDATE assistant_guides 
SET 
  name = 'Planifier un accès programmé',
  description = 'Guide pas à pas pour créer une autorisation d''accès récurrent (prestataire, famille, aide à domicile, livreur régulier...)',
  guide_key = 'schedule_door_access'
WHERE guide_key = 'schedule_nanny_access';