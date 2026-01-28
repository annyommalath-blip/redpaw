-- Remove phone_number column from profiles table to eliminate exposure risk
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone_number;

-- Also drop the get_profile_phone_number function since we're removing the column
DROP FUNCTION IF EXISTS public.get_profile_phone_number(uuid);