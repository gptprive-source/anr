-- Add plan-specific extra member price IDs to app_config
INSERT INTO app_config (key, value, category, description) VALUES 
  ('particulier_extra_member_stripe_price_id', '"price_1SdHngEDmI80OIpdcvx2sPGi"', 'pricing', 'Stripe Price ID for Particulier extra member'),
  ('pro_extra_member_stripe_price_id', '"price_1SdHniEDmI80OIpduIpTwwxS"', 'pricing', 'Stripe Price ID for Pro extra member'),
  ('entreprise_extra_member_stripe_price_id', '"price_1SdHnjEDmI80OIpdRIa0Wskx"', 'pricing', 'Stripe Price ID for Entreprise extra member'),
  ('collectivites_extra_member_stripe_price_id', '"price_1SdHnlEDmI80OIpd0fBi9AJA"', 'pricing', 'Stripe Price ID for Collectivités extra member')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();