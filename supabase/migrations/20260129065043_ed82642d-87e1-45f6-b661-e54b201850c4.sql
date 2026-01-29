-- Add preferred_language column to profiles table for i18n support
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';

-- Add a check constraint for valid language codes
ALTER TABLE public.profiles
ADD CONSTRAINT valid_language_code CHECK (
  preferred_language IN ('en', 'lo', 'th', 'zh-Hans')
);