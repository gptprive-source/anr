-- Add soft delete columns for residents on visitor_messages
ALTER TABLE visitor_messages ADD COLUMN IF NOT EXISTS deleted_by_resident BOOLEAN DEFAULT FALSE;

-- Add soft delete columns for both parties on message_replies
ALTER TABLE message_replies ADD COLUMN IF NOT EXISTS deleted_by_resident BOOLEAN DEFAULT FALSE;
ALTER TABLE message_replies ADD COLUMN IF NOT EXISTS deleted_by_visitor BOOLEAN DEFAULT FALSE;