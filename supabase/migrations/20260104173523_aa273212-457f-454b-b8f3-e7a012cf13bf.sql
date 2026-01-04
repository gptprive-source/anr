-- Clean up all references first
UPDATE app_config SET updated_by = NULL WHERE updated_by = 'c7e43a56-e122-4cee-b9ef-4a3040a72f0d';
DELETE FROM admin_audit_logs WHERE user_id = 'c7e43a56-e122-4cee-b9ef-4a3040a72f0d';
DELETE FROM relay_points WHERE user_id = 'c7e43a56-e122-4cee-b9ef-4a3040a72f0d';
DELETE FROM residents WHERE user_id = 'c7e43a56-e122-4cee-b9ef-4a3040a72f0d';
DELETE FROM push_tokens WHERE user_id = 'c7e43a56-e122-4cee-b9ef-4a3040a72f0d';
DELETE FROM call_participants WHERE user_id = 'c7e43a56-e122-4cee-b9ef-4a3040a72f0d';
UPDATE call_logs SET answered_by = NULL WHERE answered_by = 'c7e43a56-e122-4cee-b9ef-4a3040a72f0d';

-- Delete from auth.users (will cascade to profiles)
DELETE FROM auth.users WHERE id = 'c7e43a56-e122-4cee-b9ef-4a3040a72f0d';