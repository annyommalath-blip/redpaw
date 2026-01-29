-- Create notification type enum
CREATE TYPE public.notification_type AS ENUM (
  'assigned_job_owner',
  'assigned_job_sitter', 
  'lost_dog_nearby',
  'care_request_nearby',
  'medication_expiring',
  'sighting_reported'
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link_type TEXT, -- 'care_request', 'lost_alert', 'dog', etc.
  link_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON public.notifications(user_id, is_read);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- System can insert notifications (we'll use security definer functions)
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Function to create notification for assignment (called when application is approved)
CREATE OR REPLACE FUNCTION public.create_assignment_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request care_requests%ROWTYPE;
  v_dog dogs%ROWTYPE;
  v_owner_profile profiles%ROWTYPE;
  v_sitter_profile profiles%ROWTYPE;
  v_owner_name TEXT;
  v_sitter_name TEXT;
BEGIN
  -- Only trigger when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Get the care request
    SELECT * INTO v_request FROM care_requests WHERE id = NEW.request_id;
    
    -- Get the dog
    SELECT * INTO v_dog FROM dogs WHERE id = v_request.dog_id;
    
    -- Get owner profile
    SELECT * INTO v_owner_profile FROM profiles WHERE user_id = v_request.owner_id;
    v_owner_name := COALESCE(
      NULLIF(TRIM(COALESCE(v_owner_profile.first_name, '') || ' ' || COALESCE(v_owner_profile.last_name, '')), ''),
      v_owner_profile.display_name,
      'Owner'
    );
    
    -- Get sitter profile
    SELECT * INTO v_sitter_profile FROM profiles WHERE user_id = NEW.applicant_id;
    v_sitter_name := COALESCE(
      NULLIF(TRIM(COALESCE(v_sitter_profile.first_name, '') || ' ' || COALESCE(v_sitter_profile.last_name, '')), ''),
      v_sitter_profile.display_name,
      'Sitter'
    );
    
    -- Notify owner
    INSERT INTO notifications (user_id, type, title, body, link_type, link_id)
    VALUES (
      v_request.owner_id,
      'assigned_job_owner',
      'Sitter Assigned',
      'You assigned ' || v_sitter_name || ' for ' || v_dog.name,
      'care_request',
      v_request.id
    );
    
    -- Notify sitter
    INSERT INTO notifications (user_id, type, title, body, link_type, link_id)
    VALUES (
      NEW.applicant_id,
      'assigned_job_sitter',
      'You''ve Been Assigned!',
      'You''ve been assigned to care for ' || v_dog.name,
      'care_request',
      v_request.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for assignment notifications
CREATE TRIGGER on_application_approved
  AFTER UPDATE ON care_applications
  FOR EACH ROW
  EXECUTE FUNCTION create_assignment_notifications();

-- Function to create notification for sighting reports
CREATE OR REPLACE FUNCTION public.create_sighting_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert lost_alerts%ROWTYPE;
  v_dog dogs%ROWTYPE;
BEGIN
  -- Get the lost alert
  SELECT * INTO v_alert FROM lost_alerts WHERE id = NEW.alert_id;
  
  -- Get the dog
  SELECT * INTO v_dog FROM dogs WHERE id = v_alert.dog_id;
  
  -- Only notify if the reporter is not the owner
  IF NEW.reporter_id != v_alert.owner_id THEN
    INSERT INTO notifications (user_id, type, title, body, link_type, link_id)
    VALUES (
      v_alert.owner_id,
      'sighting_reported',
      'New Sighting Reported',
      'Someone reported a sighting of ' || v_dog.name || '!',
      'lost_alert',
      v_alert.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for sighting notifications
CREATE TRIGGER on_sighting_created
  AFTER INSERT ON sightings
  FOR EACH ROW
  EXECUTE FUNCTION create_sighting_notification();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;