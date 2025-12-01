-- Cleanup all stale calls (ringing calls that should have ended)
UPDATE call_logs 
SET status = 'ended', ended_at = now() 
WHERE status IN ('ringing', 'answered', 'connecting');

UPDATE call_participants 
SET status = 'ended', left_at = now() 
WHERE status IN ('ringing', 'answered', 'in_group', 'connecting');