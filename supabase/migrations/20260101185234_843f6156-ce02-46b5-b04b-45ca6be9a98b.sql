-- PHASE 1: Drop old messaging tables
DROP TABLE IF EXISTS message_replies CASCADE;
DROP TABLE IF EXISTS visitor_messages CASCADE;
DROP TABLE IF EXISTS visitor_message_templates CASCADE;
DROP TABLE IF EXISTS direct_messages CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_keys CASCADE;

-- PHASE 2: Create new chats table
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant1_id UUID NOT NULL,
  participant2_id UUID NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  last_message_preview TEXT,
  unread_count_p1 INTEGER DEFAULT 0,
  unread_count_p2 INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chats_participants_unique UNIQUE (participant1_id, participant2_id),
  CONSTRAINT chats_ordered_participants CHECK (participant1_id < participant2_id)
);

CREATE INDEX idx_chats_participant1 ON chats(participant1_id);
CREATE INDEX idx_chats_participant2 ON chats(participant2_id);
CREATE INDEX idx_chats_last_message ON chats(last_message_at DESC);

-- Create chat_messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT,
  voice_url TEXT,
  media_url TEXT,
  media_type TEXT CHECK (media_type IS NULL OR media_type IN ('image', 'video')),
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'voice', 'media', 'missed_call', 'call_ended')),
  call_duration_seconds INTEGER,
  is_read BOOLEAN DEFAULT false,
  deleted_for_sender BOOLEAN DEFAULT false,
  deleted_for_recipient BOOLEAN DEFAULT false,
  deleted_for_everyone BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  forwarded_from_id UUID REFERENCES chat_messages(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chat_messages_chat ON chat_messages(chat_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);

-- Enable RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Chats policies
CREATE POLICY "Users can view their chats"
  ON chats FOR SELECT
  USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY "Users can create chats"
  ON chats FOR INSERT
  WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY "Users can update their chats"
  ON chats FOR UPDATE
  USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY "Users can delete their chats"
  ON chats FOR DELETE
  USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- Messages policies
CREATE POLICY "Users can view messages in their chats"
  ON chat_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chats 
    WHERE chats.id = chat_messages.chat_id 
    AND (chats.participant1_id = auth.uid() OR chats.participant2_id = auth.uid())
  ));

CREATE POLICY "Users can send messages in their chats"
  ON chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = chat_messages.chat_id 
      AND (chats.participant1_id = auth.uid() OR chats.participant2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update messages in their chats"
  ON chat_messages FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM chats 
    WHERE chats.id = chat_messages.chat_id 
    AND (chats.participant1_id = auth.uid() OR chats.participant2_id = auth.uid())
  ));

-- Trigger function to update chat on new message
CREATE OR REPLACE FUNCTION update_chat_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chats 
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = CASE 
      WHEN NEW.message_type = 'voice' THEN '🎤 Message vocal'
      WHEN NEW.message_type = 'media' THEN '📷 Photo/Vidéo'
      WHEN NEW.message_type = 'missed_call' THEN '📞 Appel manqué'
      WHEN NEW.message_type = 'call_ended' THEN '📞 Appel terminé'
      ELSE LEFT(NEW.content, 50)
    END,
    unread_count_p1 = CASE 
      WHEN NEW.sender_id != participant1_id THEN unread_count_p1 + 1 
      ELSE unread_count_p1 
    END,
    unread_count_p2 = CASE 
      WHEN NEW.sender_id != participant2_id THEN unread_count_p2 + 1 
      ELSE unread_count_p2 
    END
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_chat_last_message
AFTER INSERT ON chat_messages
FOR EACH ROW EXECUTE FUNCTION update_chat_last_message();

-- Enable Realtime
ALTER TABLE chat_messages REPLICA IDENTITY FULL;
ALTER TABLE chats REPLICA IDENTITY FULL;