-- Fix infinite recursion in pro_company_roles policy
-- Create a security definer function to check company ownership without RLS recursion
CREATE OR REPLACE FUNCTION public.is_company_owner(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pro_company_roles
    WHERE user_id = _user_id 
      AND company_id = _company_id 
      AND role = 'owner'
  )
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Company owners can manage roles" ON public.pro_company_roles;

-- Recreate without recursion
CREATE POLICY "Company owners can manage roles" 
ON public.pro_company_roles 
FOR ALL 
USING (is_company_owner(auth.uid(), company_id));

-- Add column to door_scheduled_access for call forwarding
ALTER TABLE public.door_scheduled_access 
ADD COLUMN IF NOT EXISTS forward_calls_to_beneficiary boolean DEFAULT false;

-- Add beneficiary identification columns
ALTER TABLE public.door_scheduled_access 
ADD COLUMN IF NOT EXISTS beneficiary_first_name text,
ADD COLUMN IF NOT EXISTS beneficiary_last_name text,
ADD COLUMN IF NOT EXISTS beneficiary_anr_code text;