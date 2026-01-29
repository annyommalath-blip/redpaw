-- Fix: Replace security definer VIEW with security definer FUNCTION + invoker view
-- This is the Supabase-recommended pattern for safely exposing data

-- Drop the existing view
DROP VIEW IF EXISTS public.profiles_public;

-- Create a security definer FUNCTION to safely expose public profile data
-- Functions with SECURITY DEFINER + SET search_path are the correct pattern
CREATE OR REPLACE FUNCTION public.get_public_profiles()
RETURNS TABLE (
  user_id uuid,
  display_name text,
  first_name text,
  last_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.display_name,
    p.first_name,
    p.last_name,
    p.avatar_url
  FROM public.profiles p;
$$;

-- Create view WITH security_invoker that uses the function
CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT * FROM public.get_public_profiles();

-- Grant SELECT to authenticated users only
GRANT SELECT ON public.profiles_public TO authenticated;
REVOKE ALL ON public.profiles_public FROM anon, public;