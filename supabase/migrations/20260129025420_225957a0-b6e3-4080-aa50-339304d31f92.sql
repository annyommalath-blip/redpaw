-- Allow authenticated users to insert notifications for themselves
-- This enables client-side medication expiration checks
CREATE POLICY "Users can insert their own notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() = user_id);