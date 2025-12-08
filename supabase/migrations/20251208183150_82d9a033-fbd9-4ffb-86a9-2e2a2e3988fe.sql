-- Fix existing doming_orders: is_free should be true ONLY when total_price = 0
UPDATE doming_orders 
SET is_free = CASE 
  WHEN total_price = 0 THEN true 
  ELSE false 
END;