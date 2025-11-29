-- Insert test ANR for development
INSERT INTO public.anrs (code, address, latitude, longitude)
VALUES ('ANR-TEST001', '12 Rue des Lilas, 75011 Paris', 48.8566, 2.3522)
ON CONFLICT DO NOTHING;

-- Insert test habitation
INSERT INTO public.habitations (anr_id, name, floor)
SELECT id, 'Appartement Test', '2ème étage'
FROM public.anrs WHERE code = 'ANR-TEST001'
ON CONFLICT DO NOTHING;