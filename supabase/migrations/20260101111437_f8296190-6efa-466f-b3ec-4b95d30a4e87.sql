-- Create a function to get user email for contacts (security definer)
CREATE OR REPLACE FUNCTION public.get_user_email_for_contact(target_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Only allow authenticated users to get emails
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = target_user_id;
  
  RETURN user_email;
END;
$$;