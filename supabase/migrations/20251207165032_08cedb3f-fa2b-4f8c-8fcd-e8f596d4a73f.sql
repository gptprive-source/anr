-- Create faq_sections table for dynamic section management
CREATE TABLE public.faq_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT DEFAULT 'HelpCircle',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Enable RLS
ALTER TABLE public.faq_sections ENABLE ROW LEVEL SECURITY;

-- Anyone can read active sections
CREATE POLICY "Anyone can read active sections" ON public.faq_sections
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Admins can manage sections
CREATE POLICY "Admins can insert sections" ON public.faq_sections
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can update sections" ON public.faq_sections
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can delete sections" ON public.faq_sections
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_faq_sections_updated_at
  BEFORE UPDATE ON public.faq_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial sections from existing data
INSERT INTO public.faq_sections (name, icon, sort_order) VALUES
  ('L''APPLICATION ANR', 'Smartphone', 1),
  ('ABONNEMENT & PAIEMENT', 'CreditCard', 2),
  ('RÉSIDENTS & INVITÉS', 'Users', 3),
  ('DÉMÉNAGEMENT', 'Home', 4),
  ('SÉCURITÉ', 'Shield', 5);