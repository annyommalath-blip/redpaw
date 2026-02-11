
-- Add column first
ALTER TABLE public.profiles ADD COLUMN username text;
CREATE UNIQUE INDEX idx_profiles_username ON public.profiles (username);
ALTER TABLE public.profiles ADD CONSTRAINT chk_username_format
  CHECK (username IS NULL OR username ~ '^[a-z0-9_.]{1,30}$');

-- Now drop old function+view and recreate
DROP FUNCTION public.get_public_profiles() CASCADE;

CREATE FUNCTION public.get_public_profiles()
 RETURNS TABLE(user_id uuid, display_name text, first_name text, last_name text, avatar_url text, bio text, username text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT p.user_id, p.display_name, p.first_name, p.last_name, p.avatar_url, p.bio, p.username
  FROM public.profiles p;
$$;

CREATE VIEW public.profiles_public
WITH (security_invoker = on)
AS SELECT * FROM public.get_public_profiles();

CREATE OR REPLACE FUNCTION public.get_user_id_by_username(p_username text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT user_id FROM public.profiles WHERE username = lower(p_username) LIMIT 1;
$$;
