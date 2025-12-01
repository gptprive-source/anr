-- Add first_name and last_name columns to resident_invitations
ALTER TABLE public.resident_invitations
ADD COLUMN first_name text,
ADD COLUMN last_name text;