-- Add max_gps_update_distance column to anrs table
ALTER TABLE public.anrs ADD COLUMN max_gps_update_distance integer DEFAULT NULL;

COMMENT ON COLUMN public.anrs.max_gps_update_distance IS 'Distance maximale en mètres pour la mise à jour GPS. NULL = valeur par défaut (200m)';