-- Corriger l'adresse de livraison pour la commande existante
UPDATE doming_orders 
SET shipping_address = '21 bis avenue Cuvier 93420 Villepinte'
WHERE id = '5b5c4be2-3158-468f-b54c-6bb301d83053';