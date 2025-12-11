-- Add plan-specific door module price IDs to app_config
INSERT INTO app_config (key, value, category, description) VALUES 
  ('particulier_door_module_stripe_price_id', '"price_1SdHl4EDmI80OIpdRElBno3a"', 'pricing', 'Stripe Price ID for Particulier door module'),
  ('pro_door_module_stripe_price_id', '"price_1SdHl5EDmI80OIpd1cYhsfgC"', 'pricing', 'Stripe Price ID for Pro door module'),
  ('entreprise_door_module_stripe_price_id', '"price_1SdHl7EDmI80OIpdmjfnvJO0"', 'pricing', 'Stripe Price ID for Entreprise door module'),
  ('collectivites_door_module_stripe_price_id', '"price_1SdHl8EDmI80OIpdfvcwCJ5O"', 'pricing', 'Stripe Price ID for Collectivités door module'),
  ('particulier_door_module_price', '129', 'pricing', 'Door module price for Particulier'),
  ('pro_door_module_price', '129', 'pricing', 'Door module price for Pro'),
  ('entreprise_door_module_price', '129', 'pricing', 'Door module price for Entreprise'),
  ('collectivites_door_module_price', '129', 'pricing', 'Door module price for Collectivités')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();