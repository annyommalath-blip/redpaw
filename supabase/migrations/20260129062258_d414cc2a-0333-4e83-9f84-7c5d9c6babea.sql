-- Create found_dog_replies table for comments on found dog posts
CREATE TABLE public.found_dog_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.found_dogs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.found_dog_replies ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view replies on active found dog posts
CREATE POLICY "Authenticated users can view replies"
ON public.found_dog_replies
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.found_dogs fd
    WHERE fd.id = post_id
    AND (fd.status = 'active' OR fd.reporter_id = auth.uid())
  )
);

-- Users can insert their own replies
CREATE POLICY "Users can insert their own replies"
ON public.found_dog_replies
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own replies
CREATE POLICY "Users can delete their own replies"
ON public.found_dog_replies
FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for replies
ALTER PUBLICATION supabase_realtime ADD TABLE public.found_dog_replies;

-- Add index for faster lookups
CREATE INDEX idx_found_dog_replies_post_id ON public.found_dog_replies(post_id);