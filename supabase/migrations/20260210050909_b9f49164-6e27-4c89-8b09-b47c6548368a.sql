
-- Drop view first (depends on function)
DROP VIEW IF EXISTS public.profiles_public;

-- Drop old function
DROP FUNCTION IF EXISTS public.get_public_profiles();

-- Recreate with bio column
CREATE OR REPLACE FUNCTION public.get_public_profiles()
RETURNS TABLE (
  user_id uuid,
  display_name text,
  first_name text,
  last_name text,
  avatar_url text,
  bio text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.display_name, p.first_name, p.last_name, p.avatar_url, p.bio
  FROM public.profiles p;
$$;

-- Recreate view
CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT * FROM public.get_public_profiles();

GRANT SELECT ON public.profiles_public TO authenticated;
