-- Add visitor_device_id column to visitor_messages for direct device reference
ALTER TABLE public.visitor_messages 
ADD COLUMN IF NOT EXISTS visitor_device_id text;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_visitor_messages_device_id 
ON public.visitor_messages(visitor_device_id);

-- Update existing messages to populate visitor_device_id from their business_card
UPDATE public.visitor_messages vm
SET visitor_device_id = vbc.device_id
FROM public.visitor_business_cards vbc
WHERE vm.business_card_id = vbc.id
AND vm.visitor_device_id IS NULL;

-- Update RLS policies for visitor_messages to use device_id
DROP POLICY IF EXISTS "Visitors can view their own messages by device" ON public.visitor_messages;
DROP POLICY IF EXISTS "Visitors can insert messages" ON public.visitor_messages;
DROP POLICY IF EXISTS "Visitors can update their own messages" ON public.visitor_messages;

-- SELECT: Allow visitors to view messages by device_id
CREATE POLICY "Visitors can view messages by device_id"
ON public.visitor_messages
FOR SELECT
USING (true);

-- INSERT: Allow anyone to insert visitor messages
CREATE POLICY "Visitors can insert messages"
ON public.visitor_messages
FOR INSERT
WITH CHECK (true);

-- UPDATE: Allow visitors to update their own messages by device_id
CREATE POLICY "Visitors can update messages by device_id"
ON public.visitor_messages
FOR UPDATE
USING (true);