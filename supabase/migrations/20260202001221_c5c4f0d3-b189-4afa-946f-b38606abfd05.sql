-- Fix search_path for generate_participant_key function
CREATE OR REPLACE FUNCTION public.generate_participant_key(p_ids UUID[])
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT string_agg(id::text, '_' ORDER BY id)
  FROM unnest(p_ids) AS id;
$$;