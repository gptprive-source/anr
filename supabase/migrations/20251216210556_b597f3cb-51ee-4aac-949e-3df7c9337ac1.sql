-- Create a function to notify visitor device when resident replies
CREATE OR REPLACE FUNCTION public.notify_visitor_on_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device_id TEXT;
  v_visitor_name TEXT;
  v_message_preview TEXT;
BEGIN
  -- Get the device_id from the original message's business card
  SELECT vbc.device_id, COALESCE(vbc.first_name, 'Visiteur') || ' ' || COALESCE(vbc.last_name, '')
  INTO v_device_id, v_visitor_name
  FROM visitor_messages vm
  JOIN visitor_business_cards vbc ON vm.business_card_id = vbc.id
  WHERE vm.id = NEW.original_message_id;

  -- Only create notification if device_id exists and business card has no user_id (non-subscribed visitor)
  IF v_device_id IS NOT NULL THEN
    -- Get message preview (first 50 chars of reply text)
    v_message_preview := LEFT(COALESCE(NEW.reply_text, '🎤 Message vocal'), 50);
    IF NEW.reply_media_url IS NOT NULL AND NEW.reply_text IS NULL THEN
      v_message_preview := '📎 Fichier joint';
    END IF;
    IF NEW.is_encrypted = true THEN
      v_message_preview := '🔐 Message chiffré';
    END IF;

    -- Insert notification for visitor device
    INSERT INTO visitor_device_notifications (
      device_id,
      type,
      title,
      message,
      data,
      is_read,
      created_at
    ) VALUES (
      v_device_id,
      'new_reply',
      'Nouvelle réponse du résident',
      v_message_preview,
      jsonb_build_object(
        'message_id', NEW.original_message_id,
        'reply_id', NEW.id,
        'habitation_id', NEW.habitation_id
      ),
      false,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on message_replies
DROP TRIGGER IF EXISTS trigger_notify_visitor_on_reply ON message_replies;
CREATE TRIGGER trigger_notify_visitor_on_reply
  AFTER INSERT ON message_replies
  FOR EACH ROW
  EXECUTE FUNCTION notify_visitor_on_reply();

-- Add RLS policy for visitors to read their own notifications
CREATE POLICY "Anyone can read notifications by device_id"
  ON visitor_device_notifications
  FOR SELECT
  USING (true);

-- Enable RLS on the table
ALTER TABLE visitor_device_notifications ENABLE ROW LEVEL SECURITY;