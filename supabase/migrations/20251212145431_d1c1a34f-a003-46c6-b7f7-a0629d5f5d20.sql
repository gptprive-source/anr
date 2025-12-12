-- End the stuck call
UPDATE call_logs SET status = 'ended', ended_at = NOW() WHERE id = '36dc9715-f131-45ef-a779-6bf27d144670';

-- End all participants for this call
UPDATE call_participants SET status = 'ended', left_at = NOW() WHERE call_id = '36dc9715-f131-45ef-a779-6bf27d144670' AND status IN ('ringing', 'answered');