-- Add feedback and correction columns to chatbot_usage
ALTER TABLE chatbot_usage ADD COLUMN IF NOT EXISTS user_rating TEXT;
ALTER TABLE chatbot_usage ADD COLUMN IF NOT EXISTS admin_correction TEXT;
ALTER TABLE chatbot_usage ADD COLUMN IF NOT EXISTS corrected_by UUID;
ALTER TABLE chatbot_usage ADD COLUMN IF NOT EXISTS corrected_at TIMESTAMPTZ;
ALTER TABLE chatbot_usage ADD COLUMN IF NOT EXISTS is_reviewed BOOLEAN DEFAULT false;

-- Add index for efficient querying of unreviewed negative feedback
CREATE INDEX IF NOT EXISTS idx_chatbot_usage_review_status ON chatbot_usage(is_reviewed, user_rating);

-- Update RLS policy for admins to update corrections
CREATE POLICY "Admins can update chatbot usage" 
ON chatbot_usage 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Allow service to update user ratings
CREATE POLICY "Service can update ratings" 
ON chatbot_usage 
FOR UPDATE 
USING (true);