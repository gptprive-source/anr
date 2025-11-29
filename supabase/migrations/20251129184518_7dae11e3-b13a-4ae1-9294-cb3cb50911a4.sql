-- Table pour gérer les participants aux appels
CREATE TABLE public.call_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  habitation_id UUID REFERENCES public.habitations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'resident', -- 'visitor', 'resident', 'owner'
  status TEXT NOT NULL DEFAULT 'ringing', -- 'ringing', 'answered', 'declined', 'transferred', 'in_group'
  joined_at TIMESTAMP WITH TIME ZONE,
  left_at TIMESTAMP WITH TIME ZONE,
  is_muted BOOLEAN DEFAULT false,
  is_video_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_call_participants_call_id ON public.call_participants(call_id);
CREATE INDEX idx_call_participants_user_id ON public.call_participants(user_id);

-- Enable RLS
ALTER TABLE public.call_participants ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can create call participants"
ON public.call_participants FOR INSERT
WITH CHECK (true);

CREATE POLICY "Participants can view call participants"
ON public.call_participants FOR SELECT
USING (true);

CREATE POLICY "Participants can update their own status"
ON public.call_participants FOR UPDATE
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Anyone can delete call participants"
ON public.call_participants FOR DELETE
USING (true);

-- Enable realtime for call_participants
ALTER PUBLICATION supabase_realtime ADD TABLE call_participants;

-- Enable realtime for call_signals (if not already)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'call_signals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE call_signals;
  END IF;
END $$;