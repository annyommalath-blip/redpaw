
-- Add new notification type for follows
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'new_follower';

-- Create trigger function for follow notifications
CREATE OR REPLACE FUNCTION public.create_follow_notification()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_follower_profile profiles%ROWTYPE;
  v_follower_name TEXT;
BEGIN
  -- Get follower profile
  SELECT * INTO v_follower_profile FROM profiles WHERE user_id = NEW.follower_id;
  v_follower_name := COALESCE(
    v_follower_profile.username,
    NULLIF(TRIM(COALESCE(v_follower_profile.first_name, '') || ' ' || COALESCE(v_follower_profile.last_name, '')), ''),
    v_follower_profile.display_name,
    'Someone'
  );

  INSERT INTO notifications (user_id, type, title, body, link_type, link_id, body_params)
  VALUES (
    NEW.following_id,
    'new_follower',
    'New Follower',
    v_follower_name || ' followed you',
    'user',
    NEW.follower_id,
    jsonb_build_object('followerName', v_follower_name, 'followerId', NEW.follower_id::text)
  );

  RETURN NEW;
END;
$function$;

-- Create trigger on user_follows
CREATE TRIGGER on_new_follow
  AFTER INSERT ON public.user_follows
  FOR EACH ROW
  EXECUTE FUNCTION public.create_follow_notification();
