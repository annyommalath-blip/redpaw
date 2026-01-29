
-- Create status enum for found dogs
CREATE TYPE public.found_dog_status AS ENUM ('active', 'reunited', 'closed');

-- Create found_dogs table
CREATE TABLE public.found_dogs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  location_label TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_source TEXT DEFAULT 'manual',
  found_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status found_dog_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.found_dogs ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view active found posts
CREATE POLICY "Authenticated users can view active found dogs"
ON public.found_dogs
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (status = 'active' OR reporter_id = auth.uid())
);

-- Only reporter can insert their own posts
CREATE POLICY "Users can create their own found dog posts"
ON public.found_dogs
FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- Only reporter can update their post
CREATE POLICY "Reporters can update their own posts"
ON public.found_dogs
FOR UPDATE
USING (auth.uid() = reporter_id);

-- Only reporter can delete their post
CREATE POLICY "Reporters can delete their own posts"
ON public.found_dogs
FOR DELETE
USING (auth.uid() = reporter_id);

-- Create updated_at trigger
CREATE TRIGGER update_found_dogs_updated_at
BEFORE UPDATE ON public.found_dogs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for found dog photos
INSERT INTO storage.buckets (id, name, public) VALUES ('found-dog-photos', 'found-dog-photos', true);

-- Storage policies for found dog photos
CREATE POLICY "Anyone can view found dog photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'found-dog-photos');

CREATE POLICY "Authenticated users can upload found dog photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'found-dog-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own found dog photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'found-dog-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own found dog photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'found-dog-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Update profiles RLS to allow viewing reporter profiles for found dogs
DROP POLICY IF EXISTS "Users can view relevant profiles" ON public.profiles;

CREATE POLICY "Users can view relevant profiles"
ON public.profiles
FOR SELECT
USING (
  (auth.uid() = user_id)
  OR (EXISTS (
    SELECT 1 FROM conversations c
    WHERE (auth.uid() = ANY(c.participant_ids)) AND (profiles.user_id = ANY(c.participant_ids))
  ))
  OR (EXISTS (
    SELECT 1 FROM care_requests cr
    JOIN care_applications ca ON ca.request_id = cr.id
    WHERE cr.owner_id = auth.uid() AND ca.applicant_id = profiles.user_id
  ))
  OR (EXISTS (
    SELECT 1 FROM care_requests cr
    WHERE cr.owner_id = profiles.user_id
    AND (cr.assigned_sitter_id = auth.uid() OR EXISTS (
      SELECT 1 FROM care_applications ca
      WHERE ca.request_id = cr.id AND ca.applicant_id = auth.uid()
    ))
  ))
  OR (EXISTS (
    SELECT 1 FROM lost_alerts la
    JOIN sightings s ON s.alert_id = la.id
    WHERE la.owner_id = auth.uid() AND s.reporter_id = profiles.user_id
  ))
  OR (EXISTS (
    SELECT 1 FROM sightings s
    JOIN lost_alerts la ON la.id = s.alert_id
    WHERE s.reporter_id = auth.uid() AND la.owner_id = profiles.user_id
  ))
  OR (EXISTS (
    SELECT 1 FROM found_dogs fd
    WHERE fd.status = 'active' AND fd.reporter_id = profiles.user_id
  ))
);
