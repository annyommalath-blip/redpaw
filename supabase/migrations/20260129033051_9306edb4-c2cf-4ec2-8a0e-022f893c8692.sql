
-- Update the assignment notifications function to handle multi-dog requests and remove owner self-notification
CREATE OR REPLACE FUNCTION public.create_assignment_notifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_request care_requests%ROWTYPE;
  v_dog dogs%ROWTYPE;
  v_owner_profile profiles%ROWTYPE;
  v_sitter_profile profiles%ROWTYPE;
  v_owner_name TEXT;
  v_sitter_name TEXT;
  v_dog_count INT;
  v_care_verb TEXT;
  v_sitter_body TEXT;
BEGIN
  -- Only trigger when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Get the care request
    SELECT * INTO v_request FROM care_requests WHERE id = NEW.request_id;
    
    -- Calculate dog count from dog_ids array, fallback to 1 if empty/null
    v_dog_count := COALESCE(array_length(v_request.dog_ids, 1), 0);
    IF v_dog_count = 0 THEN
      v_dog_count := 1; -- Fallback to single dog (dog_id)
    END IF;
    
    -- Get the first dog (for single dog case)
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
    
    -- Determine care verb based on care_type
    IF v_request.care_type = 'walk' THEN
      v_care_verb := 'walk';
    ELSE
      v_care_verb := 'care for';
    END IF;
    
    -- Build sitter notification body
    IF v_dog_count = 1 THEN
      v_sitter_body := 'You were assigned to ' || v_care_verb || ' ' || v_dog.name || '.';
    ELSE
      v_sitter_body := 'You were assigned to ' || v_care_verb || ' ' || v_owner_name || '''s dogs (' || v_dog_count || ' dogs).';
    END IF;
    
    -- NOTE: We do NOT notify the owner since they initiated this action (no self-notifications)
    -- Only notify the sitter
    INSERT INTO notifications (user_id, type, title, body, link_type, link_id)
    VALUES (
      NEW.applicant_id,
      'assigned_job_sitter',
      'You''ve Been Assigned!',
      v_sitter_body,
      'care_request',
      v_request.id
    );
  END IF;
  
  RETURN NEW;
END;
$function$;
