
-- Create reposts table (tracks who reposted which post)
CREATE TABLE public.reposts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Enable RLS
ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;

-- Users can view reposts
CREATE POLICY "Authenticated users can view reposts"
ON public.reposts FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Users can repost
CREATE POLICY "Users can create their own reposts"
ON public.reposts FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can unrepost
CREATE POLICY "Users can delete their own reposts"
ON public.reposts FOR DELETE
USING (auth.uid() = user_id);
