
-- Allow anonymous (non-authenticated) users to view public posts
DROP POLICY IF EXISTS "Users can view posts based on visibility" ON public.posts;
CREATE POLICY "Users can view posts based on visibility"
ON public.posts FOR SELECT
USING (
  (visibility = 'public'::post_visibility)
  OR (auth.uid() = user_id)
  OR ((visibility = 'friends'::post_visibility) AND is_following(auth.uid(), user_id))
);

-- Allow anonymous users to view public post likes
DROP POLICY IF EXISTS "Anyone can view likes" ON public.post_likes;
CREATE POLICY "Anyone can view likes"
ON public.post_likes FOR SELECT
USING (true);

-- Allow anonymous users to view public post comments
DROP POLICY IF EXISTS "Anyone can view comments" ON public.post_comments;
CREATE POLICY "Anyone can view comments"
ON public.post_comments FOR SELECT
USING (true);

-- Allow anonymous users to view active lost alerts
DROP POLICY IF EXISTS "Authenticated users can view active lost alerts" ON public.lost_alerts;
CREATE POLICY "Anyone can view active lost alerts"
ON public.lost_alerts FOR SELECT
USING (
  (status = 'active'::alert_status)
  OR (auth.uid() = owner_id)
  OR has_dog_access(auth.uid(), dog_id)
);

-- Allow anonymous users to view active found dogs
DROP POLICY IF EXISTS "Authenticated users can view active found dogs" ON public.found_dogs;
CREATE POLICY "Anyone can view active found dogs"
ON public.found_dogs FOR SELECT
USING (
  (status = 'active'::found_dog_status)
  OR (auth.uid() = reporter_id)
);

-- Allow anonymous users to view open care requests
DROP POLICY IF EXISTS "Authenticated users can view open care requests" ON public.care_requests;
CREATE POLICY "Anyone can view open care requests"
ON public.care_requests FOR SELECT
USING (
  (status = 'open'::request_status)
  OR (auth.uid() = owner_id)
  OR (auth.uid() = assigned_sitter_id)
);

-- Allow anonymous users to view dogs linked to public content
DROP POLICY IF EXISTS "Users can view dogs" ON public.dogs;
CREATE POLICY "Users can view dogs"
ON public.dogs FOR SELECT
USING (
  (auth.uid() = owner_id)
  OR has_dog_access(auth.uid(), id)
  OR (EXISTS ( SELECT 1 FROM care_requests cr WHERE ((cr.status = 'open'::request_status) AND ((cr.dog_id = dogs.id) OR (dogs.id = ANY (cr.dog_ids))))))
  OR (EXISTS ( SELECT 1 FROM lost_alerts la WHERE ((la.dog_id = dogs.id) AND (la.status = 'active'::alert_status))))
);

-- Allow anonymous users to view reposts
DROP POLICY IF EXISTS "Authenticated users can view reposts" ON public.reposts;
CREATE POLICY "Anyone can view reposts"
ON public.reposts FOR SELECT
USING (true);

-- Allow anonymous users to view follows (needed for feed)
DROP POLICY IF EXISTS "Authenticated users can view follows" ON public.user_follows;
CREATE POLICY "Anyone can view follows"
ON public.user_follows FOR SELECT
USING (true);
