-- Add resolved_at column to track when dog was found
ALTER TABLE public.lost_alerts 
ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Update existing resolved alerts to use updated_at as resolved_at
UPDATE public.lost_alerts 
SET resolved_at = updated_at 
WHERE status = 'resolved' AND resolved_at IS NULL;