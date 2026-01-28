-- Fix care_requests location exposure: Only authenticated users can see exact locations
-- Non-authenticated users cannot view care requests at all

DROP POLICY IF EXISTS "Anyone can view open care requests" ON public.care_requests;

-- Only authenticated users can view open care requests
-- Owners can always see their own requests
CREATE POLICY "Authenticated users can view open care requests"
ON public.care_requests
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    status = 'open'::request_status 
    OR auth.uid() = owner_id
    OR auth.uid() = assigned_sitter_id
  )
);

-- For profiles phone_number exposure:
-- We need to update the RLS policy to NOT expose phone_number to everyone
-- However, RLS works at row level, not column level
-- The safest approach is to create a database function that returns phone_number 
-- only when the viewer has a legitimate relationship

-- Create a function to safely get phone number only for authorized viewers
CREATE OR REPLACE FUNCTION public.get_profile_phone_number(profile_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      -- Always show to profile owner
      WHEN auth.uid() = profile_user_id THEN phone_number
      -- Show to assigned sitters for the owner's care requests
      WHEN EXISTS (
        SELECT 1 FROM care_requests cr
        WHERE cr.owner_id = profile_user_id
        AND cr.assigned_sitter_id = auth.uid()
        AND cr.status = 'open'::request_status
      ) THEN phone_number
      -- Hide from everyone else
      ELSE NULL
    END
  FROM profiles
  WHERE user_id = profile_user_id;
$$;