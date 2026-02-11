
-- Add new notification types
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'post_comment';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'post_like';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'post_repost';

-- Trigger for post comments (notify post owner)
CREATE OR REPLACE FUNCTION public.create_post_comment_notification()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_post posts%ROWTYPE;
  v_commenter_profile profiles%ROWTYPE;
  v_commenter_name TEXT;
BEGIN
  SELECT * INTO v_post FROM posts WHERE id = NEW.post_id;
  
  -- Don't notify if commenter is the post owner
  IF NEW.user_id = v_post.user_id THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_commenter_profile FROM profiles WHERE user_id = NEW.user_id;
  v_commenter_name := COALESCE(
    v_commenter_profile.username,
    v_commenter_profile.display_name,
    'Someone'
  );

  INSERT INTO notifications (user_id, type, title, body, link_type, link_id, body_params)
  VALUES (
    v_post.user_id,
    'post_comment',
    'New Comment',
    v_commenter_name || ' commented on your post',
    'post',
    v_post.id,
    jsonb_build_object('commenterName', v_commenter_name, 'commentText', LEFT(NEW.text, 80))
  );

  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_post_comment
  AFTER INSERT ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_post_comment_notification();

-- Trigger for post likes (notify post owner)
CREATE OR REPLACE FUNCTION public.create_post_like_notification()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_post posts%ROWTYPE;
  v_liker_profile profiles%ROWTYPE;
  v_liker_name TEXT;
BEGIN
  SELECT * INTO v_post FROM posts WHERE id = NEW.post_id;

  -- Don't notify if liker is the post owner
  IF NEW.user_id = v_post.user_id THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_liker_profile FROM profiles WHERE user_id = NEW.user_id;
  v_liker_name := COALESCE(
    v_liker_profile.username,
    v_liker_profile.display_name,
    'Someone'
  );

  INSERT INTO notifications (user_id, type, title, body, link_type, link_id, body_params)
  VALUES (
    v_post.user_id,
    'post_like',
    'New Like',
    v_liker_name || ' liked your post',
    'post',
    v_post.id,
    jsonb_build_object('likerName', v_liker_name)
  );

  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_post_like
  AFTER INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.create_post_like_notification();

-- Trigger for reposts (notify original post owner)
CREATE OR REPLACE FUNCTION public.create_post_repost_notification()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_original_post posts%ROWTYPE;
  v_reposter_profile profiles%ROWTYPE;
  v_reposter_name TEXT;
BEGIN
  SELECT * INTO v_original_post FROM posts WHERE id = NEW.post_id;

  -- Don't notify if reposter is the post owner
  IF NEW.user_id = v_original_post.user_id THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_reposter_profile FROM profiles WHERE user_id = NEW.user_id;
  v_reposter_name := COALESCE(
    v_reposter_profile.username,
    v_reposter_profile.display_name,
    'Someone'
  );

  INSERT INTO notifications (user_id, type, title, body, link_type, link_id, body_params)
  VALUES (
    v_original_post.user_id,
    'post_repost',
    'Post Reposted',
    v_reposter_name || ' reposted your post',
    'post',
    v_original_post.id,
    jsonb_build_object('reposterName', v_reposter_name)
  );

  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_post_repost
  AFTER INSERT ON public.reposts
  FOR EACH ROW
  EXECUTE FUNCTION public.create_post_repost_notification();
