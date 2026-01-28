-- Add archived_at column to care_requests for manual archiving
ALTER TABLE public.care_requests
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone DEFAULT NULL;