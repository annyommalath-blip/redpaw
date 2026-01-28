-- Add media_urls column to sightings table for photo/video attachments
ALTER TABLE public.sightings
ADD COLUMN IF NOT EXISTS media_urls text[] DEFAULT '{}'::text[];