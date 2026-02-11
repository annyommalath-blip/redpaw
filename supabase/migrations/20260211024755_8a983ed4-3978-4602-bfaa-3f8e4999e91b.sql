
-- Remove first_name and last_name from public profiles function and view
DROP FUNCTION IF EXISTS public.get_public_profiles() CASCADE;

CREATE OR REPLACE FUNCTION public.get_public_profiles()
 RETURNS TABLE(user_id uuid, display_name text, avatar_url text, bio text, username text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT p.user_id, p.display_name, p.avatar_url, p.bio, p.username
  FROM public.profiles p;
$$;

-- Recreate profiles_public view without first_name/last_name
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on)
AS SELECT * FROM public.get_public_profiles();
