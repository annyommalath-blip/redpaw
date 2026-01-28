-- Create a security definer function to check if user can view profile location
-- Location is only visible to: 1) profile owner, 2) assigned sitter, 3) owner of assigned sitter
CREATE OR REPLACE FUNCTION public.get_profile_location(target_user_id uuid)
RETURNS TABLE(city text, postal_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Always allow viewing own location
  IF auth.uid() = target_user_id THEN
    RETURN QUERY SELECT p.city, p.postal_code FROM profiles p WHERE p.user_id = target_user_id;
    RETURN;
  END IF;
  
  -- Check if current user is assigned sitter for target user's care request
  -- OR if target user is assigned sitter for current user's care request
  IF EXISTS (
    SELECT 1 FROM care_requests cr
    WHERE cr.status = 'open'
    AND cr.assigned_sitter_id IS NOT NULL
    AND (
      -- Current user is assigned sitter for target's request
      (cr.owner_id = target_user_id AND cr.assigned_sitter_id = auth.uid())
      OR
      -- Target user is assigned sitter for current user's request
      (cr.owner_id = auth.uid() AND cr.assigned_sitter_id = target_user_id)
    )
  ) THEN
    RETURN QUERY SELECT p.city, p.postal_code FROM profiles p WHERE p.user_id = target_user_id;
    RETURN;
  END IF;
  
  -- Otherwise return nulls (no access to location)
  RETURN QUERY SELECT NULL::text, NULL::text;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_profile_location(uuid) TO authenticated;