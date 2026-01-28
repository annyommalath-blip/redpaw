-- Create storage bucket for sighting media
INSERT INTO storage.buckets (id, name, public)
VALUES ('sighting-media', 'sighting-media', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for sighting media
CREATE POLICY "Anyone can view sighting media"
ON storage.objects FOR SELECT
USING (bucket_id = 'sighting-media');

CREATE POLICY "Authenticated users can upload sighting media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'sighting-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own sighting media"
ON storage.objects FOR DELETE
USING (bucket_id = 'sighting-media' AND auth.uid()::text = (storage.foldername(name))[1]);