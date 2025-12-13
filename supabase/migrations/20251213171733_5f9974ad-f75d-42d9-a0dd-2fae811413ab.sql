-- Add soft delete column for visitor messages
ALTER TABLE visitor_messages ADD COLUMN IF NOT EXISTS deleted_by_visitor boolean DEFAULT false;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_visitor_messages_deleted_by_visitor ON visitor_messages(deleted_by_visitor) WHERE deleted_by_visitor = false;