-- Permettre aux propriétaires de mettre à jour la position GPS de leur ANR
CREATE POLICY "Owners can update ANR GPS position" ON anrs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM habitations h
    JOIN residents r ON r.habitation_id = h.id
    WHERE h.anr_id = anrs.id
    AND r.user_id = auth.uid()
    AND r.is_owner = true
    AND r.status = 'verified'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM habitations h
    JOIN residents r ON r.habitation_id = h.id
    WHERE h.anr_id = anrs.id
    AND r.user_id = auth.uid()
    AND r.is_owner = true
    AND r.status = 'verified'
  )
);