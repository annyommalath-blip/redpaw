-- Create table to track when users last read each conversation
CREATE TABLE public.conversation_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS
ALTER TABLE public.conversation_reads ENABLE ROW LEVEL SECURITY;

-- Users can view their own read status
CREATE POLICY "Users can view their own read status"
ON public.conversation_reads FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own read status
CREATE POLICY "Users can insert their own read status"
ON public.conversation_reads FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_reads.conversation_id
    AND auth.uid() = ANY(c.participant_ids)
  )
);

-- Users can update their own read status
CREATE POLICY "Users can update their own read status"
ON public.conversation_reads FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_conversation_reads_user_id ON public.conversation_reads(user_id);
CREATE INDEX idx_conversation_reads_conversation_id ON public.conversation_reads(conversation_id);