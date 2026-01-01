-- Phase 2: Migrate existing visitor_messages to new messages table
-- sender_id = business_card.user_id, recipient_id = habitation owner

INSERT INTO public.messages (
  id,
  sender_id,
  recipient_id,
  habitation_id,
  message,
  voice_message_url,
  media_url,
  media_type,
  is_read,
  read_at,
  created_at,
  deleted_by_sender,
  deleted_by_recipient
)
SELECT 
  vm.id,
  vbc.user_id as sender_id,
  (SELECT r.user_id FROM residents r WHERE r.habitation_id = vm.habitation_id AND r.is_owner = true AND r.status = 'verified' LIMIT 1) as recipient_id,
  vm.habitation_id,
  vm.message,
  vm.voice_message_url,
  vm.media_url,
  vm.media_type,
  vm.is_read,
  vm.read_at,
  vm.created_at,
  COALESCE(vm.deleted_by_visitor, false),
  COALESCE(vm.deleted_by_resident, false)
FROM visitor_messages vm
LEFT JOIN visitor_business_cards vbc ON vm.business_card_id = vbc.id
WHERE vbc.user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM residents r WHERE r.habitation_id = vm.habitation_id AND r.is_owner = true AND r.status = 'verified');

-- Also migrate message_replies as regular messages (reverse direction: resident -> visitor)
INSERT INTO public.messages (
  sender_id,
  recipient_id,
  habitation_id,
  message,
  voice_message_url,
  media_url,
  media_type,
  is_read,
  read_at,
  created_at,
  deleted_by_sender,
  deleted_by_recipient
)
SELECT 
  mr.resident_id as sender_id,
  vbc.user_id as recipient_id,
  mr.habitation_id,
  mr.reply_text,
  mr.reply_voice_url,
  mr.reply_media_url,
  mr.reply_media_type,
  mr.is_read,
  mr.read_at,
  mr.created_at,
  COALESCE(mr.deleted_by_resident, false),
  COALESCE(mr.deleted_by_visitor, false)
FROM message_replies mr
JOIN visitor_messages vm ON vm.id = mr.original_message_id
LEFT JOIN visitor_business_cards vbc ON vm.business_card_id = vbc.id
WHERE vbc.user_id IS NOT NULL
  AND mr.resident_id IS NOT NULL;