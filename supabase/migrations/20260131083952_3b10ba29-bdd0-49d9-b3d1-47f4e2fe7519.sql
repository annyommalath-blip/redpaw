-- Create a secure function to lookup user_id by email
-- This uses SECURITY DEFINER to access auth.users which clients can't query directly
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(lookup_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user_id UUID;
BEGIN
  -- Validate email format (basic check)
  IF lookup_email IS NULL OR lookup_email = '' OR lookup_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN NULL;
  END IF;
  
  -- Look up the user by email in auth.users
  SELECT id INTO found_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(lookup_email)
  LIMIT 1;
  
  RETURN found_user_id;
END;
$$;