-- Add assigned_sitter_id to care_requests and update status enum
ALTER TABLE public.care_requests 
ADD COLUMN assigned_sitter_id UUID REFERENCES auth.users(id);

-- Create application_status enum
CREATE TYPE public.application_status AS ENUM ('pending', 'approved', 'declined', 'withdrawn');

-- Create care_applications table
CREATE TABLE public.care_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.care_requests(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES auth.users(id),
  availability_text TEXT NOT NULL,
  message TEXT NOT NULL,
  rate_offered TEXT,
  status public.application_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(request_id, applicant_id)
);

-- Enable RLS on care_applications
ALTER TABLE public.care_applications ENABLE ROW LEVEL SECURITY;

-- Applicants can view their own applications
CREATE POLICY "Applicants can view their own applications"
ON public.care_applications FOR SELECT
USING (auth.uid() = applicant_id);

-- Owners can view applications for their care requests
CREATE POLICY "Owners can view applications for their requests"
ON public.care_applications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.care_requests cr 
    WHERE cr.id = request_id AND cr.owner_id = auth.uid()
  )
);

-- Authenticated users can apply (insert their own applications)
CREATE POLICY "Users can create their own applications"
ON public.care_applications FOR INSERT
WITH CHECK (auth.uid() = applicant_id);

-- Applicants can withdraw (update) their own applications
CREATE POLICY "Applicants can update their own applications"
ON public.care_applications FOR UPDATE
USING (auth.uid() = applicant_id);

-- Owners can update applications for their care requests (approve/decline)
CREATE POLICY "Owners can update applications for their requests"
ON public.care_applications FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.care_requests cr 
    WHERE cr.id = request_id AND cr.owner_id = auth.uid()
  )
);

-- Create sitter_log_type enum
CREATE TYPE public.sitter_log_type AS ENUM ('walk', 'meal', 'potty', 'play', 'note');

-- Create sitter_logs table
CREATE TABLE public.sitter_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.care_requests(id) ON DELETE CASCADE,
  dog_id UUID NOT NULL REFERENCES public.dogs(id),
  owner_id UUID NOT NULL,
  sitter_id UUID NOT NULL REFERENCES auth.users(id),
  log_type public.sitter_log_type NOT NULL,
  note_text TEXT,
  media_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sitter_logs
ALTER TABLE public.sitter_logs ENABLE ROW LEVEL SECURITY;

-- Assigned sitters can create logs for their assigned requests
CREATE POLICY "Assigned sitters can create logs"
ON public.sitter_logs FOR INSERT
WITH CHECK (
  auth.uid() = sitter_id AND
  EXISTS (
    SELECT 1 FROM public.care_requests cr 
    WHERE cr.id = request_id 
    AND cr.assigned_sitter_id = auth.uid()
    AND cr.status = 'open'
  )
);

-- Owners can view logs for their requests
CREATE POLICY "Owners can view logs for their requests"
ON public.sitter_logs FOR SELECT
USING (auth.uid() = owner_id);

-- Sitters can view their own logs
CREATE POLICY "Sitters can view their own logs"
ON public.sitter_logs FOR SELECT
USING (auth.uid() = sitter_id);

-- Create storage bucket for sitter log media
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('sitter-logs', 'sitter-logs', true, 52428800);

-- Storage policies for sitter-logs bucket
CREATE POLICY "Authenticated users can upload sitter log media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'sitter-logs' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Anyone can view sitter log media"
ON storage.objects FOR SELECT
USING (bucket_id = 'sitter-logs');

-- Add context fields to conversations for care request chats
ALTER TABLE public.conversations 
ADD COLUMN context_type TEXT,
ADD COLUMN context_id UUID;

-- Add trigger for care_applications updated_at
CREATE TRIGGER update_care_applications_updated_at
BEFORE UPDATE ON public.care_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();