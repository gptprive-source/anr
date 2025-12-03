-- Terminer tous les appels en cours
UPDATE call_logs SET status = 'ended', ended_at = NOW() WHERE status IS NULL OR status NOT IN ('ended', 'missed');

-- Terminer tous les participants en cours
UPDATE call_participants SET status = 'ended', left_at = NOW() WHERE status NOT IN ('ended', 'declined', 'left');