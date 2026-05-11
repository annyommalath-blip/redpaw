-- ===== 1. Adoption posts: hide contact_phone from broad SELECT =====
REVOKE SELECT (contact_phone) ON public.adoption_posts FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_adoption_contact_phone(p_post_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT contact_phone
  FROM adoption_posts
  WHERE id = p_post_id AND owner_id = auth.uid();
$$;

-- ===== 2. Donation campaigns: hide contact_phone from broad SELECT =====
REVOKE SELECT (contact_phone) ON public.donation_campaigns FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_donation_contact_phone(p_campaign_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT contact_phone
  FROM donation_campaigns
  WHERE id = p_campaign_id AND owner_id = auth.uid();
$$;

-- ===== 3. Seller profiles: stop exposing KYC publicly =====
DROP POLICY IF EXISTS "Public can view approved sellers" ON public.seller_profiles;

CREATE POLICY "Self and admins can view seller profiles"
  ON public.seller_profiles
  FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Public-safe view exposing only non-sensitive fields for approved sellers
CREATE OR REPLACE VIEW public.public_seller_profiles
WITH (security_invoker = true) AS
SELECT
  id,
  user_id,
  store_name,
  store_description,
  store_logo_url,
  contact_info,
  is_active,
  seller_status,
  created_at
FROM public.seller_profiles
WHERE seller_status = 'approved';

-- The view runs with invoker rights; we need a permissive read path that bypasses
-- the new tightened policy. Use a SECURITY DEFINER function instead of a view for safety:
DROP VIEW IF EXISTS public.public_seller_profiles;

CREATE OR REPLACE FUNCTION public.get_public_seller_profile(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  store_name text,
  store_description text,
  store_logo_url text,
  contact_info text,
  is_active boolean,
  seller_status seller_status,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, user_id, store_name, store_description, store_logo_url,
         contact_info, is_active, seller_status, created_at
  FROM seller_profiles
  WHERE user_id = p_user_id AND seller_status = 'approved';
$$;

-- ===== 4. phone_otps: explicitly block all client writes =====
CREATE POLICY "Block client inserts to phone_otps"
  ON public.phone_otps
  AS RESTRICTIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "Block client updates to phone_otps"
  ON public.phone_otps
  AS RESTRICTIVE
  FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Block client deletes to phone_otps"
  ON public.phone_otps
  AS RESTRICTIVE
  FOR DELETE
  TO anon, authenticated
  USING (false);

-- ===== 5. Dogs: hide verification_secret and microchip_no from broad SELECT =====
REVOKE SELECT (verification_secret, microchip_no) ON public.dogs FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_dog_microchip(p_dog_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT microchip_no
  FROM dogs
  WHERE id = p_dog_id AND owner_id = auth.uid();
$$;