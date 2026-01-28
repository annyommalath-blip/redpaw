-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a more restrictive SELECT policy
-- Users can view:
-- 1. Their own profile
-- 2. Profiles of users they share a conversation with
-- 3. Profiles of care request owners (if user is an applicant/sitter)
-- 4. Profiles of applicants/sitters (if user is the care request owner)
CREATE POLICY "Users can view relevant profiles"
ON public.profiles
FOR SELECT
USING (
  -- Own profile
  auth.uid() = user_id
  OR
  -- Users in shared conversations
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE auth.uid() = ANY(c.participant_ids)
    AND profiles.user_id = ANY(c.participant_ids)
  )
  OR
  -- Care request owner viewing applicant profiles
  EXISTS (
    SELECT 1 FROM care_requests cr
    JOIN care_applications ca ON ca.request_id = cr.id
    WHERE cr.owner_id = auth.uid()
    AND ca.applicant_id = profiles.user_id
  )
  OR
  -- Applicant/sitter viewing care request owner profile
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
  -- Lost alert owner viewing sighting reporter profiles
  EXISTS (
    SELECT 1 FROM lost_alerts la
    JOIN sightings s ON s.alert_id = la.id
    WHERE la.owner_id = auth.uid()
    AND s.reporter_id = profiles.user_id
  )
  OR
  -- Sighting reporter viewing lost alert owner profile
  EXISTS (
    SELECT 1 FROM sightings s
    JOIN lost_alerts la ON la.id = s.alert_id
    WHERE s.reporter_id = auth.uid()
    AND la.owner_id = profiles.user_id
  )
);