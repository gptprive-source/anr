-- Add RLS policy for beneficiaries to view access granted to them via ANR code
CREATE POLICY "Beneficiaries can view access granted to their ANR" 
ON public.door_scheduled_access 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM residents r
    JOIN habitations h ON h.id = r.habitation_id
    JOIN anrs a ON a.id = h.anr_id
    WHERE r.user_id = auth.uid() 
      AND r.status = 'verified'
      AND a.code = door_scheduled_access.beneficiary_anr_code
  )
);