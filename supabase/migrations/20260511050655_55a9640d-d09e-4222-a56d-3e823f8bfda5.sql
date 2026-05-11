-- Restrict adoption_posts SELECT to authenticated role (includes anonymous-signed-in
-- guest sessions). Fully unauthenticated requests no longer see contact_phone.
DROP POLICY IF EXISTS "Anyone can view available adoption posts" ON public.adoption_posts;

CREATE POLICY "Authenticated users can view available adoption posts"
  ON public.adoption_posts
  FOR SELECT
  TO authenticated
  USING ((status = ANY (ARRAY['available'::text, 'pending'::text])) OR (auth.uid() = owner_id));