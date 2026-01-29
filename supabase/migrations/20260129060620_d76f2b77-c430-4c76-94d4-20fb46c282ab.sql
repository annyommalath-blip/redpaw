-- Fix profiles privacy: split public identity from sensitive data

-- 1) Recreate profiles_public view WITHOUT security_invoker
--    This makes it bypass the base table's RLS, allowing public name/avatar access
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public AS
SELECT 
  user_id,
  display_name,
  first_name,
  last_name,
  avatar_url
FROM public.profiles;

-- Grant SELECT to authenticated users (public identity is visible to all logged-in users)
GRANT SELECT ON public.profiles_public TO authenticated;

-- 2) Tighten the profiles table RLS policy
--    Only allow full profile access for ACTIVE relationships, not historical ones
DROP POLICY IF EXISTS "Users can view profiles with direct relationship" ON public.profiles;

CREATE POLICY "Users can view profiles with active relationship"
ON public.profiles FOR SELECT
USING (
  -- Own profile - always accessible
  auth.uid() = user_id
  OR
  -- Active care request: owner can view their assigned sitter's full profile
  EXISTS (
    SELECT 1 FROM care_requests cr
    WHERE cr.owner_id = auth.uid()
    AND cr.assigned_sitter_id = profiles.user_id
    AND cr.status = 'open'
  )
  OR
  -- Active care request: assigned sitter can view owner's full profile
  EXISTS (
    SELECT 1 FROM care_requests cr
    WHERE cr.assigned_sitter_id = auth.uid()
    AND cr.owner_id = profiles.user_id
    AND cr.status = 'open'
  )
);