
CREATE OR REPLACE FUNCTION public.create_mention_notification(
  p_mentioned_user_id UUID,
  p_comment_text TEXT,
  p_post_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_profile profiles%ROWTYPE;
  v_caller_name TEXT;
BEGIN
  -- Don't notify self
  IF p_mentioned_user_id = auth.uid() THEN
    RETURN;
  END IF;

  -- Get caller profile for the notification body
  SELECT * INTO v_caller_profile FROM profiles WHERE user_id = auth.uid();
  v_caller_name := COALESCE(
    NULLIF(TRIM(COALESCE(v_caller_profile.first_name, '') || ' ' || COALESCE(v_caller_profile.last_name, '')), ''),
    v_caller_profile.display_name,
    'Someone'
  );

  INSERT INTO notifications (user_id, type, title, body, link_type, link_id, body_params)
  VALUES (
    p_mentioned_user_id,
    'post_comment_mention',
    'You were mentioned',
    v_caller_name || ' mentioned you in a comment',
    'post',
    p_post_id,
    jsonb_build_object('mentionerName', v_caller_name, 'commentText', LEFT(p_comment_text, 80))
  );
END;
$$;
