-- Add last_applied_at column for queue ordering and reapplied_count for tracking
ALTER TABLE public.care_applications 
ADD COLUMN IF NOT EXISTS last_applied_at timestamp with time zone NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS reapplied_count integer NOT NULL DEFAULT 0;

-- Set existing applications' last_applied_at to their created_at
UPDATE public.care_applications SET last_applied_at = created_at WHERE last_applied_at = now();

-- Add notification type for reapply
ALTER TYPE public.notification_type ADD VALUE 'care_reapply';

-- Function to create notification when someone reapplies (withdrawn -> pending)
CREATE OR REPLACE FUNCTION public.create_reapply_notification()
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
  -- Only trigger when status changes from 'withdrawn' to 'pending' (reapply)
  IF NEW.status = 'pending' AND OLD.status = 'withdrawn' THEN
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
    
    -- Notify owner about reapply
    INSERT INTO notifications (user_id, type, title, body, link_type, link_id)
    VALUES (
      v_request.owner_id,
      'care_reapply',
      'Applicant Reapplied',
      v_applicant_name || ' reapplied for your care request for ' || v_dog.name,
      'care_request',
      v_request.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for reapply notifications
CREATE TRIGGER on_application_reapply
  AFTER UPDATE ON care_applications
  FOR EACH ROW
  EXECUTE FUNCTION create_reapply_notification();