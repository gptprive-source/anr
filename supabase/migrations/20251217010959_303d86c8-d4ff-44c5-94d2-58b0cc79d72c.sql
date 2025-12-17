-- Add order_type column to distinguish relay badges from regular domings
ALTER TABLE public.doming_orders 
ADD COLUMN order_type text NOT NULL DEFAULT 'doming';

-- Add constraint for valid order types
ALTER TABLE public.doming_orders 
ADD CONSTRAINT doming_orders_order_type_check 
CHECK (order_type IN ('doming', 'relay_badge'));

-- Create index for filtering by order type
CREATE INDEX idx_doming_orders_order_type ON public.doming_orders(order_type);