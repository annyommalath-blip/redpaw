-- Fix the permissive INSERT policy by restricting it to authenticated users via security definer functions only
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- No direct INSERT policy - only triggers/functions can insert
-- The security definer functions (create_assignment_notifications, create_sighting_notification) handle inserts