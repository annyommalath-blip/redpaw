
-- Add bio column to profiles
ALTER TABLE public.profiles ADD COLUMN bio text;

-- Update the public view to include bio
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public AS
SELECT
  user_id,
  display_name,
  first_name,
  last_name,
  avatar_url,
  bio
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.profiles_public TO anon, authenticated;
