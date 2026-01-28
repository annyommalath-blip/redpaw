-- Add weight_unit column to dogs table
ALTER TABLE public.dogs ADD COLUMN IF NOT EXISTS weight_unit text DEFAULT 'lbs';