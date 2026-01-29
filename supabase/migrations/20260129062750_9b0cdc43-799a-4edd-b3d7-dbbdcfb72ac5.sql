-- Add new notification type for found dog replies
ALTER TYPE public.notification_type ADD VALUE 'found_dog_reply';

-- Create trigger function for found dog reply notifications
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
  
  -- Create notification for the reporter
  INSERT INTO notifications (user_id, type, title, body, link_type, link_id)
  VALUES (
    v_found_dog.reporter_id,
    'found_dog_reply',
    'New Reply on Your Found Dog Post',
    v_replier_name || ' replied to your found dog post',
    'found_dog',
    v_found_dog.id
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_found_dog_reply_insert
  AFTER INSERT ON public.found_dog_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.create_found_dog_reply_notification();