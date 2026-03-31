
-- Fix 1: Post likes - respect post visibility
DROP POLICY IF EXISTS "Anyone can view likes" ON public.post_likes;
CREATE POLICY "Users can view likes on visible posts"
ON public.post_likes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM posts p
    WHERE p.id = post_id
    AND (
      p.visibility = 'public'::post_visibility
      OR (auth.uid() = p.user_id)
      OR (p.visibility = 'friends'::post_visibility AND is_following(auth.uid(), p.user_id))
    )
  )
);

-- Fix 2: Post comments - respect post visibility
DROP POLICY IF EXISTS "Anyone can view comments" ON public.post_comments;
CREATE POLICY "Users can view comments on visible posts"
ON public.post_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM posts p
    WHERE p.id = post_id
    AND (
      p.visibility = 'public'::post_visibility
      OR (auth.uid() = p.user_id)
      OR (p.visibility = 'friends'::post_visibility AND is_following(auth.uid(), p.user_id))
    )
  )
);

-- Fix 3: Make chat-images bucket private
UPDATE storage.buckets SET public = false WHERE id = 'chat-images';

-- Fix 3b: Replace permissive SELECT policy with participant-scoped one
DROP POLICY IF EXISTS "Anyone can view chat images" ON storage.objects;

CREATE POLICY "Conversation participants can view chat images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-images'
  AND auth.uid() IS NOT NULL
  AND (
    -- Owner can always view their own uploads
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversations c ON c.id = m.conversation_id
      WHERE m.image_url LIKE '%' || storage.filename(name) || '%'
      AND auth.uid() = ANY(c.participant_ids)
    )
  )
);
