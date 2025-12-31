-- ALL cleanup in one transaction
UPDATE app_config SET updated_by = NULL WHERE updated_by = '1eaf3a87-03ff-4c97-acf1-f714cc8959d1';
UPDATE faq_items SET updated_by = NULL WHERE updated_by = '1eaf3a87-03ff-4c97-acf1-f714cc8959d1';
UPDATE faq_items SET created_by = NULL WHERE created_by = '1eaf3a87-03ff-4c97-acf1-f714cc8959d1';
UPDATE faq_sections SET created_by = NULL WHERE created_by = '1eaf3a87-03ff-4c97-acf1-f714cc8959d1';
UPDATE security_audit_runs SET triggered_by = NULL WHERE triggered_by = '1eaf3a87-03ff-4c97-acf1-f714cc8959d1';
DELETE FROM auth.sessions WHERE user_id = '1eaf3a87-03ff-4c97-acf1-f714cc8959d1';
DELETE FROM auth.identities WHERE user_id = '1eaf3a87-03ff-4c97-acf1-f714cc8959d1';
DELETE FROM auth.users WHERE id = '1eaf3a87-03ff-4c97-acf1-f714cc8959d1';