-- Insert Stripe price IDs for Domings per plan
INSERT INTO app_config (key, value, category, description)
VALUES 
  ('particulier_doming_stripe_price_id', '"price_1SdHPiEDmI80OIpd29kMHX0F"', 'pricing', 'Stripe price ID for Doming - Particulier (5€)'),
  ('pro_doming_stripe_price_id', '"price_1SdHPjEDmI80OIpdWDR2Sd8x"', 'pricing', 'Stripe price ID for Doming - Pro (10€)'),
  ('entreprise_doming_stripe_price_id', '"price_1SdHPlEDmI80OIpdYWnlbNDD"', 'pricing', 'Stripe price ID for Doming - Entreprise (10€)'),
  ('collectivites_doming_stripe_price_id', '"price_1SdHPmEDmI80OIpdgcGCpTVp"', 'pricing', 'Stripe price ID for Doming - Collectivités (10€)')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();