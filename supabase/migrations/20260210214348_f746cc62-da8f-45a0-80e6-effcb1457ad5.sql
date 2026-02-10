-- Add photo_urls array column to posts table for multi-photo support
ALTER TABLE public.posts ADD COLUMN photo_urls text[] DEFAULT '{}';

-- Backfill existing single photo_url into photo_urls array
UPDATE public.posts
SET photo_urls = ARRAY[photo_url]
WHERE photo_url IS NOT NULL AND (photo_urls IS NULL OR photo_urls = '{}');