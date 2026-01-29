-- Drop the existing policy that allows unauthenticated access
DROP POLICY IF EXISTS "Anyone can view active lost alerts" ON public.lost_alerts;

-- Create new policy that requires authentication
CREATE POLICY "Authenticated users can view active lost alerts"
ON public.lost_alerts FOR SELECT
USING (
  (auth.uid() IS NOT NULL) AND 
  (status = 'active' OR owner_id = auth.uid())
);