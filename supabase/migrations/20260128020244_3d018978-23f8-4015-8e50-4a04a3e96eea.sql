-- Add date_of_birth column to dogs table
ALTER TABLE public.dogs ADD COLUMN IF NOT EXISTS date_of_birth date;

-- Add photo_urls array column to dogs table for multiple photos
ALTER TABLE public.dogs ADD COLUMN IF NOT EXISTS photo_urls text[] DEFAULT '{}'::text[];

-- Create storage bucket for dog photos if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('dog-photos', 'dog-photos', true, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for dog photos bucket
CREATE POLICY "Users can upload their own dog photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'dog-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own dog photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'dog-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own dog photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'dog-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Dog photos are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'dog-photos');