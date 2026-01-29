-- Add notification type for new applications
ALTER TYPE public.notification_type ADD VALUE 'new_application';

-- Function to create notification when someone applies
CREATE OR REPLACE FUNCTION public.create_application_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request care_requests%ROWTYPE;
  v_dog dogs%ROWTYPE;
  v_applicant_profile profiles%ROWTYPE;
  v_applicant_name TEXT;
BEGIN
  -- Get the care request
  SELECT * INTO v_request FROM care_requests WHERE id = NEW.request_id;
  
  -- Get the dog
  SELECT * INTO v_dog FROM dogs WHERE id = v_request.dog_id;
  
  -- Get applicant profile
  SELECT * INTO v_applicant_profile FROM profiles WHERE user_id = NEW.applicant_id;
  v_applicant_name := COALESCE(
    NULLIF(TRIM(COALESCE(v_applicant_profile.first_name, '') || ' ' || COALESCE(v_applicant_profile.last_name, '')), ''),
    v_applicant_profile.display_name,
    'Someone'
  );
  
  -- Notify owner about new application
  INSERT INTO notifications (user_id, type, title, body, link_type, link_id)
  VALUES (
    v_request.owner_id,
    'new_application',
    'New Application',
    v_applicant_name || ' applied to care for ' || v_dog.name,
    'care_request',
    v_request.id
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new applications
CREATE TRIGGER on_application_created
  AFTER INSERT ON care_applications
  FOR EACH ROW
  EXECUTE FUNCTION create_application_notification();