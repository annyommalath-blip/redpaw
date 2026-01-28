-- Add location fields to lost_alerts table
ALTER TABLE public.lost_alerts 
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision,
ADD COLUMN IF NOT EXISTS location_label text,
ADD COLUMN IF NOT EXISTS location_source text DEFAULT 'manual';

-- Add location fields to care_requests table
ALTER TABLE public.care_requests 
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision,
ADD COLUMN IF NOT EXISTS location_label text,
ADD COLUMN IF NOT EXISTS location_source text DEFAULT 'manual';

-- Add check constraint for location_source values
ALTER TABLE public.lost_alerts 
ADD CONSTRAINT lost_alerts_location_source_check 
CHECK (location_source IN ('gps', 'manual') OR location_source IS NULL);

ALTER TABLE public.care_requests 
ADD CONSTRAINT care_requests_location_source_check 
CHECK (location_source IN ('gps', 'manual') OR location_source IS NULL);