
-- Fix RLS policy for door_scheduled_access INSERT operations
-- The current policy uses USING clause but INSERT requires WITH CHECK

-- Drop the existing ALL policy
DROP POLICY IF EXISTS "Owners can manage scheduled access for their ANR" ON door_scheduled_access;

-- Create separate policies for each operation
CREATE POLICY "Owners can view scheduled access for their ANR"
ON door_scheduled_access
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM residents r
    JOIN habitations h ON h.id = r.habitation_id
    WHERE h.anr_id = door_scheduled_access.anr_id
      AND r.user_id = auth.uid()
      AND r.is_owner = true
      AND r.status = 'verified'
  )
);

CREATE POLICY "Owners can insert scheduled access for their ANR"
ON door_scheduled_access
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM residents r
    JOIN habitations h ON h.id = r.habitation_id
    WHERE h.anr_id = door_scheduled_access.anr_id
      AND r.user_id = auth.uid()
      AND r.is_owner = true
      AND r.status = 'verified'
  )
);

CREATE POLICY "Owners can update scheduled access for their ANR"
ON door_scheduled_access
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM residents r
    JOIN habitations h ON h.id = r.habitation_id
    WHERE h.anr_id = door_scheduled_access.anr_id
      AND r.user_id = auth.uid()
      AND r.is_owner = true
      AND r.status = 'verified'
  )
);

CREATE POLICY "Owners can delete scheduled access for their ANR"
ON door_scheduled_access
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM residents r
    JOIN habitations h ON h.id = r.habitation_id
    WHERE h.anr_id = door_scheduled_access.anr_id
      AND r.user_id = auth.uid()
      AND r.is_owner = true
      AND r.status = 'verified'
  )
);
