-- Add carrier billing and relay payout configuration keys
INSERT INTO app_config (key, value, category, description) VALUES
  ('carrier_rate_per_relay_deposit', '0.30', 'relay', 'Tarif facturé au transporteur par dépôt en point relais (€)'),
  ('carrier_rate_per_direct_delivery', '0.25', 'relay', 'Tarif facturé au transporteur par livraison directe au destinataire (€)'),
  ('carrier_invoice_day_of_month', '1', 'relay', 'Jour du mois pour la génération automatique des factures transporteurs'),
  ('relay_rate_per_parcel', '1.50', 'relay', 'Rémunération du point relais par colis traité (€)'),
  ('relay_minimum_payout', '20.00', 'relay', 'Seuil minimum de paiement pour les points relais (€)')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = now();