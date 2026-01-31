-- Add body_params column to store dynamic values for translation
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS body_params JSONB;

-- Update create_application_notification to store params
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
  
  -- Notify owner about new application with params for translation
  INSERT INTO notifications (user_id, type, title, body, link_type, link_id, body_params)
  VALUES (
    v_request.owner_id,
    'new_application',
    'New Application',
    v_applicant_name || ' applied to care for ' || v_dog.name,
    'care_request',
    v_request.id,
    jsonb_build_object('applicantName', v_applicant_name, 'dogName', v_dog.name)
  );
  
  RETURN NEW;
END;
$$;

-- Update create_withdrawal_notification to store params
CREATE OR REPLACE FUNCTION public.create_withdrawal_notification()
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
  -- Only trigger when status changes to 'withdrawn'
  IF NEW.status = 'withdrawn' AND (OLD.status IS NULL OR OLD.status != 'withdrawn') THEN
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
    
    -- Notify owner about withdrawal with params
    INSERT INTO notifications (user_id, type, title, body, link_type, link_id, body_params)
    VALUES (
      v_request.owner_id,
      'application_withdrawn',
      'Application Withdrawn',
      v_applicant_name || ' withdrew their application for ' || v_dog.name,
      'care_request',
      v_request.id,
      jsonb_build_object('applicantName', v_applicant_name, 'dogName', v_dog.name)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update create_reapply_notification to store params
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
    
    -- Notify owner about reapply with params
    INSERT INTO notifications (user_id, type, title, body, link_type, link_id, body_params)
    VALUES (
      v_request.owner_id,
      'care_reapply',
      'Applicant Reapplied',
      v_applicant_name || ' reapplied for your care request for ' || v_dog.name,
      'care_request',
      v_request.id,
      jsonb_build_object('applicantName', v_applicant_name, 'dogName', v_dog.name)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update create_assignment_notifications to store params
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
    -- Only notify the sitter with params
    INSERT INTO notifications (user_id, type, title, body, link_type, link_id, body_params)
    VALUES (
      NEW.applicant_id,
      'assigned_job_sitter',
      'You''ve Been Assigned!',
      v_sitter_body,
      'care_request',
      v_request.id,
      jsonb_build_object(
        'dogName', v_dog.name, 
        'ownerName', v_owner_name, 
        'dogCount', v_dog_count, 
        'careType', v_request.care_type::text
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update create_sighting_notification to store params
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
    INSERT INTO notifications (user_id, type, title, body, link_type, link_id, body_params)
    VALUES (
      v_alert.owner_id,
      'sighting_reported',
      'New Sighting Reported',
      'Someone reported a sighting of ' || v_dog.name || '!',
      'lost_alert',
      v_alert.id,
      jsonb_build_object('dogName', v_dog.name)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update create_found_dog_reply_notification to store params
CREATE OR REPLACE FUNCTION public.create_found_dog_reply_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_found_dog found_dogs%ROWTYPE;
  v_replier_profile profiles%ROWTYPE;
  v_replier_name TEXT;
BEGIN
  -- Get the found dog post
  SELECT * INTO v_found_dog FROM found_dogs WHERE id = NEW.post_id;
  
  -- Don't notify if replier is the reporter (no self-notifications)
  IF NEW.user_id = v_found_dog.reporter_id THEN
    RETURN NEW;
  END IF;
  
  -- Get replier profile
  SELECT * INTO v_replier_profile FROM profiles WHERE user_id = NEW.user_id;
  v_replier_name := COALESCE(
    NULLIF(TRIM(COALESCE(v_replier_profile.first_name, '') || ' ' || COALESCE(v_replier_profile.last_name, '')), ''),
    v_replier_profile.display_name,
    'Someone'
  );
  
  -- Create notification for the reporter with params
  INSERT INTO notifications (user_id, type, title, body, link_type, link_id, body_params)
  VALUES (
    v_found_dog.reporter_id,
    'found_dog_reply',
    'New Reply on Your Found Dog Post',
    v_replier_name || ' replied to your found dog post',
    'found_dog',
    v_found_dog.id,
    jsonb_build_object('replierName', v_replier_name)
  );
  
  RETURN NEW;
END;
$$;