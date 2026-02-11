-- Add mention notification type
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'post_comment_mention';
