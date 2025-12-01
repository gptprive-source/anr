-- Drop the unique constraint on phone_number (it causes issues for invited users without phone)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_number_key;

-- Make phone_number nullable
ALTER TABLE public.profiles ALTER COLUMN phone_number DROP NOT NULL;

-- Create a partial unique index that only applies to non-empty phone numbers
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_number_unique_idx 
ON public.profiles (phone_number) 
WHERE phone_number IS NOT NULL AND phone_number != '';

-- Update the trigger to handle null phone numbers properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, phone_number, first_name, last_name)
  VALUES (
    NEW.id,
    NULLIF(COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone_number', ''), ''),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$;