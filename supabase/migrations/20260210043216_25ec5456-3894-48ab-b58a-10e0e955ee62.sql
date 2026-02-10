
-- Create post visibility enum
CREATE TYPE public.post_visibility AS ENUM ('public', 'friends', 'private');

-- Create user_follows table
CREATE TABLE public.user_follows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Enable RLS
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_follows
CREATE POLICY "Authenticated users can view follows"
  ON public.user_follows FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can follow others"
  ON public.user_follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.user_follows FOR DELETE
  USING (auth.uid() = follower_id);

-- Add visibility column to posts (default 'public' for backward compatibility)
ALTER TABLE public.posts ADD COLUMN visibility public.post_visibility NOT NULL DEFAULT 'public';

-- Create a security definer function to check if user follows another
CREATE OR REPLACE FUNCTION public.is_following(p_follower_id uuid, p_following_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_follows
    WHERE follower_id = p_follower_id
    AND following_id = p_following_id
  );
$$;

-- Drop old permissive SELECT policy on posts
DROP POLICY IF EXISTS "Anyone can view posts" ON public.posts;

-- Create new visibility-aware SELECT policy
CREATE POLICY "Users can view posts based on visibility"
  ON public.posts FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- Public posts visible to all authenticated users
      visibility = 'public'
      -- Own posts always visible
      OR auth.uid() = user_id
      -- Friends posts visible to followers
      OR (visibility = 'friends' AND is_following(auth.uid(), user_id))
      -- Private posts only visible to author (covered by auth.uid() = user_id above)
    )
  );
