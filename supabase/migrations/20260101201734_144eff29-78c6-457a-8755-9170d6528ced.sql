-- Create a trigger to restore chat visibility when a new message is sent
CREATE OR REPLACE FUNCTION public.restore_chat_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Reset deleted flags when a new message is sent so both users can see the conversation again
  UPDATE chats 
  SET 
    deleted_for_p1 = false,
    deleted_for_p2 = false
  WHERE id = NEW.chat_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS restore_chat_visibility ON chat_messages;
CREATE TRIGGER restore_chat_visibility
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_chat_on_new_message();