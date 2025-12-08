-- Drop the problematic NULLS NOT DISTINCT constraints
ALTER TABLE face_embeddings DROP CONSTRAINT IF EXISTS one_active_embedding_per_user;
ALTER TABLE face_embeddings DROP CONSTRAINT IF EXISTS one_active_embedding_per_employee;

-- Create partial unique indexes (correct approach)
-- These only apply when user_id/employee_id is NOT NULL, avoiding NULL = NULL conflicts
CREATE UNIQUE INDEX one_active_embedding_per_user 
  ON face_embeddings (user_id) 
  WHERE deleted_at IS NULL AND user_id IS NOT NULL;

CREATE UNIQUE INDEX one_active_embedding_per_employee 
  ON face_embeddings (employee_id) 
  WHERE deleted_at IS NULL AND employee_id IS NOT NULL;