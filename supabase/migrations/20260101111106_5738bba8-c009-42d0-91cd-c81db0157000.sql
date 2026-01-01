-- Add columns to store conversation context for visitor-added contacts
ALTER TABLE public.resident_contacts 
ADD COLUMN IF NOT EXISTS contact_user_id UUID,
ADD COLUMN IF NOT EXISTS habitation_id UUID;

-- Add foreign key constraints
ALTER TABLE public.resident_contacts
ADD CONSTRAINT fk_resident_contacts_habitation 
FOREIGN KEY (habitation_id) REFERENCES public.habitations(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_resident_contacts_habitation_id ON public.resident_contacts(habitation_id);
CREATE INDEX IF NOT EXISTS idx_resident_contacts_contact_user_id ON public.resident_contacts(contact_user_id);