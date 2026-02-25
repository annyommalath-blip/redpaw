
-- Community comments for donation campaigns and adoption posts
CREATE TABLE public.community_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  context_type TEXT NOT NULL, -- 'donation' or 'adoption'
  context_id UUID NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view community comments"
  ON public.community_comments FOR SELECT
  USING (true);

CREATE POLICY "Signed-in users can create comments"
  ON public.community_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.community_comments FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_community_comments_context ON public.community_comments (context_type, context_id);
