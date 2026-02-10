
-- Recreate view with security_invoker to address linter warning
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public WITH (security_invoker=on) AS
SELECT
  user_id,
  display_name,
  first_name,
  last_name,
  avatar_url,
  bio
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;
