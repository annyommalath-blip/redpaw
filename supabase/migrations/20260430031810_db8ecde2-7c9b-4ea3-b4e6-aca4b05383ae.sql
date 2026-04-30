-- ============================================================================
-- 1. ROLES SYSTEM (admin, moderator, user)
-- ============================================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed admin for annyommalath@gmail.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE LOWER(email) = 'annyommalath@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================================================
-- 2. SELLER STATUS ENUM + EXTEND seller_profiles
-- ============================================================================
CREATE TYPE public.seller_status AS ENUM ('draft', 'pending_verification', 'approved', 'rejected', 'suspended');
CREATE TYPE public.identity_status AS ENUM ('not_started', 'pending', 'verified', 'rejected');
CREATE TYPE public.business_type AS ENUM ('individual', 'business');

ALTER TABLE public.seller_profiles
  ADD COLUMN seller_status seller_status NOT NULL DEFAULT 'draft',
  ADD COLUMN identity_status identity_status NOT NULL DEFAULT 'not_started',
  ADD COLUMN phone_e164 TEXT,
  ADD COLUMN phone_verified_at TIMESTAMPTZ,
  ADD COLUMN legal_first_name TEXT,
  ADD COLUMN legal_last_name TEXT,
  ADD COLUMN date_of_birth DATE,
  ADD COLUMN id_type TEXT,
  ADD COLUMN id_number_last4 TEXT,
  ADD COLUMN address_line1 TEXT,
  ADD COLUMN address_line2 TEXT,
  ADD COLUMN address_city TEXT,
  ADD COLUMN address_state TEXT,
  ADD COLUMN address_postal_code TEXT,
  ADD COLUMN address_country TEXT,
  ADD COLUMN business_type business_type,
  ADD COLUMN business_name TEXT,
  ADD COLUMN tax_id TEXT,
  ADD COLUMN policy_accepted_at TIMESTAMPTZ,
  ADD COLUMN submitted_at TIMESTAMPTZ,
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN reviewed_by UUID,
  ADD COLUMN rejection_reason TEXT,
  ADD COLUMN suspension_reason TEXT;

-- One seller profile per user
ALTER TABLE public.seller_profiles ADD CONSTRAINT seller_profiles_user_id_unique UNIQUE (user_id);

-- One phone per seller (unique when not null)
CREATE UNIQUE INDEX seller_profiles_phone_unique
  ON public.seller_profiles (phone_e164)
  WHERE phone_e164 IS NOT NULL;

-- Drop old policies that conflict with new model
DROP POLICY IF EXISTS "Anyone can view active seller profiles" ON public.seller_profiles;
DROP POLICY IF EXISTS "Users can update their own seller profile" ON public.seller_profiles;
DROP POLICY IF EXISTS "Users can delete their own seller profile" ON public.seller_profiles;

-- New policies
CREATE POLICY "Public can view approved sellers"
  ON public.seller_profiles FOR SELECT
  USING (seller_status = 'approved' OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update only draft or rejected profile fields"
  ON public.seller_profiles FOR UPDATE
  USING (auth.uid() = user_id AND seller_status IN ('draft', 'rejected'))
  WITH CHECK (auth.uid() = user_id AND seller_status IN ('draft', 'rejected', 'pending_verification'));

CREATE POLICY "Admins can update any seller profile"
  ON public.seller_profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete their own draft profile"
  ON public.seller_profiles FOR DELETE
  USING (auth.uid() = user_id AND seller_status = 'draft');

CREATE POLICY "Admins can delete seller profiles"
  ON public.seller_profiles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Tighten products: only approved sellers can create
DROP POLICY IF EXISTS "Active sellers can create products" ON public.products;
CREATE POLICY "Approved sellers can create products"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = seller_id
    AND EXISTS (
      SELECT 1 FROM public.seller_profiles sp
      WHERE sp.user_id = auth.uid() AND sp.seller_status = 'approved'
    )
  );

-- ============================================================================
-- 3. PHONE OTP TABLE
-- ============================================================================
CREATE TABLE public.phone_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  phone_e164 TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;

-- No direct client access; only edge functions (service role) operate on this table
CREATE POLICY "Users can view their own OTP records"
  ON public.phone_otps FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX phone_otps_user_id_created_at_idx ON public.phone_otps (user_id, created_at DESC);
CREATE INDEX phone_otps_phone_idx ON public.phone_otps (phone_e164);

-- ============================================================================
-- 4. VERIFICATION DOCUMENTS TABLE
-- ============================================================================
CREATE TYPE public.document_kind AS ENUM ('id_front', 'id_back', 'selfie');

CREATE TABLE public.seller_verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_profile_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  kind document_kind NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (seller_profile_id, kind)
);

ALTER TABLE public.seller_verification_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own docs"
  ON public.seller_verification_documents FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner can insert own docs"
  ON public.seller_verification_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own docs while not approved"
  ON public.seller_verification_documents FOR UPDATE
  USING (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.seller_profiles sp
      WHERE sp.id = seller_profile_id AND sp.seller_status IN ('draft', 'rejected')
    )
  );

CREATE POLICY "Owner or admin can delete docs"
  ON public.seller_verification_documents FOR DELETE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 5. PRIVATE STORAGE BUCKET FOR SELLER DOCS
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('seller-documents', 'seller-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Sellers can upload own verification docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'seller-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Sellers can read own verification docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'seller-documents'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Sellers can update own verification docs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'seller-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Sellers and admins can delete verification docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'seller-documents'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- ============================================================================
-- 6. SECURITY DEFINER RPC FOR ADMIN STATUS CHANGES
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_update_seller_status(
  p_seller_profile_id UUID,
  p_new_status seller_status,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change seller status';
  END IF;

  UPDATE public.seller_profiles
  SET
    seller_status = p_new_status,
    identity_status = CASE
      WHEN p_new_status = 'approved' THEN 'verified'::identity_status
      WHEN p_new_status = 'rejected' THEN 'rejected'::identity_status
      ELSE identity_status
    END,
    rejection_reason = CASE WHEN p_new_status = 'rejected' THEN p_reason ELSE rejection_reason END,
    suspension_reason = CASE WHEN p_new_status = 'suspended' THEN p_reason ELSE suspension_reason END,
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    is_active = CASE WHEN p_new_status = 'approved' THEN true ELSE false END
  WHERE id = p_seller_profile_id;

  -- Notify the seller
  INSERT INTO public.notifications (user_id, type, title, body, link_type, link_id)
  SELECT
    sp.user_id,
    'seller_status_changed'::notification_type,
    CASE
      WHEN p_new_status = 'approved' THEN 'Seller Application Approved!'
      WHEN p_new_status = 'rejected' THEN 'Seller Application Rejected'
      WHEN p_new_status = 'suspended' THEN 'Seller Account Suspended'
      ELSE 'Seller Status Updated'
    END,
    CASE
      WHEN p_new_status = 'approved' THEN 'You can now create and sell products in the shop.'
      WHEN p_new_status = 'rejected' THEN COALESCE(p_reason, 'Please review and resubmit your application.')
      WHEN p_new_status = 'suspended' THEN COALESCE(p_reason, 'Your seller account has been suspended.')
      ELSE 'Your seller status has been updated.'
    END,
    'seller',
    sp.id
  FROM public.seller_profiles sp
  WHERE sp.id = p_seller_profile_id;
END;
$$;

-- Add notification type if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'seller_status_changed'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
  ) THEN
    ALTER TYPE public.notification_type ADD VALUE 'seller_status_changed';
  END IF;
END $$;

-- ============================================================================
-- 7. UPDATED_AT TRIGGER FOR seller_profiles (if missing)
-- ============================================================================
DROP TRIGGER IF EXISTS update_seller_profiles_updated_at ON public.seller_profiles;
CREATE TRIGGER update_seller_profiles_updated_at
  BEFORE UPDATE ON public.seller_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();