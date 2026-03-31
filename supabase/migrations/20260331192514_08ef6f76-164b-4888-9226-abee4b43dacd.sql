
-- Fix 1: Create a secure function to get verification_secret (owner-only)
CREATE OR REPLACE FUNCTION public.get_dog_verification_secret(p_dog_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT verification_secret INTO v_secret
  FROM dogs
  WHERE id = p_dog_id AND owner_id = auth.uid();
  
  RETURN v_secret;
END;
$$;

-- Fix 2: Restrict donation_records SELECT to donors and campaign owners only
DROP POLICY IF EXISTS "Anyone can view non-deleted donation records" ON public.donation_records;

CREATE POLICY "Donors and campaign owners can view donation records"
ON public.donation_records FOR SELECT
USING (
  is_deleted = false
  AND (
    auth.uid() = donor_id
    OR EXISTS (
      SELECT 1 FROM donation_campaigns dc
      WHERE dc.id = donation_records.campaign_id
      AND dc.owner_id = auth.uid()
    )
  )
);
