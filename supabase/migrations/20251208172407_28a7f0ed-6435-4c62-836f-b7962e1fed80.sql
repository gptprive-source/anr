-- Add RLS policies for admins to view doming_orders
CREATE POLICY "Admins can view all doming orders" 
ON public.doming_orders 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Add RLS policies for admins to view subscriptions
CREATE POLICY "Admins can view all subscriptions" 
ON public.subscriptions 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Add RLS policies for admins to update doming_orders
CREATE POLICY "Admins can update doming orders" 
ON public.doming_orders 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Add RLS policies for admins to update subscriptions
CREATE POLICY "Admins can update subscriptions" 
ON public.subscriptions 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);