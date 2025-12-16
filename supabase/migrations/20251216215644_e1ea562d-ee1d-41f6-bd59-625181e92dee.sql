-- Add visitor_messages and message_replies to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE visitor_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_replies;

-- Enable REPLICA IDENTITY FULL for complete row data in realtime events
ALTER TABLE visitor_messages REPLICA IDENTITY FULL;
ALTER TABLE message_replies REPLICA IDENTITY FULL;