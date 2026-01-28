-- Add dog_ids array column to support multiple dogs in one care request
ALTER TABLE public.care_requests 
ADD COLUMN dog_ids uuid[] DEFAULT '{}';

-- Migrate existing data: copy dog_id into dog_ids array
UPDATE public.care_requests 
SET dog_ids = ARRAY[dog_id] 
WHERE dog_id IS NOT NULL;