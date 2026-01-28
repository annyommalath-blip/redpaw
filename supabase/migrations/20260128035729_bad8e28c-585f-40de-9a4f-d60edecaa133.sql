-- Add owner profile fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN first_name text,
ADD COLUMN last_name text,
ADD COLUMN city text,
ADD COLUMN postal_code text;