-- Create a public-safe view of profiles (only non-sensitive fields)
CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT 
  user_id,
  display_name,
  first_name,
  last_name,
  avatar_url
FROM public.profiles;

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.profiles_public TO authenticated;

-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view relevant profiles" ON public.profiles;

-- Create a restrictive policy that only allows:
-- 1. Users viewing their own profile
-- 2. Users in the same conversation
-- 3. Users with an active care request relationship (owner/assigned sitter)
-- 4. Users who have interacted via lost alert sightings
-- NO ACCESS just for found dog posts - use profiles_public view instead
CREATE POLICY "Users can view profiles with direct relationship"
ON public.profiles FOR SELECT
USING (
  -- Own profile
  auth.uid() = user_id
  OR
  -- Conversation participants
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE auth.uid() = ANY(c.participant_ids)
    AND profiles.user_id = ANY(c.participant_ids)
  )
  OR
  -- Owner viewing applicant's profile for their care request
  EXISTS (
    SELECT 1 FROM care_requests cr
    JOIN care_applications ca ON ca.request_id = cr.id
    WHERE cr.owner_id = auth.uid()
    AND ca.applicant_id = profiles.user_id
  )
  OR
  -- Applicant/sitter viewing owner's profile for care request they're involved in
  EXISTS (
    SELECT 1 FROM care_requests cr
    WHERE cr.owner_id = profiles.user_id
    AND (
      cr.assigned_sitter_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM care_applications ca
        WHERE ca.request_id = cr.id
        AND ca.applicant_id = auth.uid()
      )
    )
  )
  OR
  -- Lost alert: owner can see sighting reporter profiles
  EXISTS (
    SELECT 1 FROM lost_alerts la
    JOIN sightings s ON s.alert_id = la.id
    WHERE la.owner_id = auth.uid()
    AND s.reporter_id = profiles.user_id
  )
  OR
  -- Lost alert: sighting reporter can see owner profile
  EXISTS (
    SELECT 1 FROM sightings s
    JOIN lost_alerts la ON la.id = s.alert_id
    WHERE s.reporter_id = auth.uid()
    AND la.owner_id = profiles.user_id
  )
);