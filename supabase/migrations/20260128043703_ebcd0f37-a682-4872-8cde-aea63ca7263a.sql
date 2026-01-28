-- Add optional microchip number column to dogs table
-- This field is sensitive and should only be visible to the owner
ALTER TABLE public.dogs ADD COLUMN microchip_no TEXT;