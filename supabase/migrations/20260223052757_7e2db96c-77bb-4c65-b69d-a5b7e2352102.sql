
-- ==========================================
-- DONATION CAMPAIGNS
-- ==========================================
CREATE TABLE public.donation_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  caption TEXT NOT NULL,
  about TEXT,
  goal_amount NUMERIC NOT NULL,
  raised_amount NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'other',
  contact_phone TEXT,
  location_label TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  photo_urls TEXT[] NOT NULL DEFAULT '{}'::text[],
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.donation_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active donation campaigns"
  ON public.donation_campaigns FOR SELECT
  USING (status = 'active' OR auth.uid() = owner_id);

CREATE POLICY "Users can create their own campaigns"
  ON public.donation_campaigns FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their campaigns"
  ON public.donation_campaigns FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their campaigns"
  ON public.donation_campaigns FOR DELETE
  USING (auth.uid() = owner_id);

-- ==========================================
-- DONATION RECORDS
-- ==========================================
CREATE TABLE public.donation_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.donation_campaigns(id) ON DELETE CASCADE,
  donor_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  receipt_url TEXT NOT NULL,
  note TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.donation_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view non-deleted donation records"
  ON public.donation_records FOR SELECT
  USING (is_deleted = false);

CREATE POLICY "Signed-in users can create donation records"
  ON public.donation_records FOR INSERT
  WITH CHECK (auth.uid() = donor_id);

CREATE POLICY "Campaign owners can soft-delete records"
  ON public.donation_records FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.donation_campaigns dc
      WHERE dc.id = donation_records.campaign_id AND dc.owner_id = auth.uid()
    )
    OR auth.uid() = donor_id
  );

-- Function to update raised_amount on donation_records insert
CREATE OR REPLACE FUNCTION public.update_campaign_raised_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE donation_campaigns
    SET raised_amount = raised_amount + NEW.amount
    WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_raised_on_donation
  AFTER INSERT ON public.donation_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_campaign_raised_amount();

-- ==========================================
-- ADOPTION POSTS
-- ==========================================
CREATE TABLE public.adoption_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  pet_name TEXT NOT NULL,
  pet_type TEXT NOT NULL DEFAULT 'dog',
  breed TEXT,
  age TEXT,
  size TEXT,
  is_spayed_neutered BOOLEAN,
  is_vaccinated BOOLEAN,
  temperament TEXT,
  reason TEXT,
  adoption_fee NUMERIC,
  adoption_fee_currency TEXT DEFAULT 'USD',
  contact_phone TEXT,
  location_label TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  photo_urls TEXT[] NOT NULL DEFAULT '{}'::text[],
  status TEXT NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.adoption_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view available adoption posts"
  ON public.adoption_posts FOR SELECT
  USING (status IN ('available', 'pending') OR auth.uid() = owner_id);

CREATE POLICY "Users can create their own adoption posts"
  ON public.adoption_posts FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their adoption posts"
  ON public.adoption_posts FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their adoption posts"
  ON public.adoption_posts FOR DELETE
  USING (auth.uid() = owner_id);

-- ==========================================
-- STORAGE BUCKETS
-- ==========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('donation-photos', 'donation-photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('donation-receipts', 'donation-receipts', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('adoption-photos', 'adoption-photos', true);

-- Storage policies for donation photos (public read)
CREATE POLICY "Anyone can view donation photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'donation-photos');

CREATE POLICY "Authenticated users can upload donation photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'donation-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own donation photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'donation-photos' AND auth.uid() IS NOT NULL);

-- Storage policies for donation receipts (private)
CREATE POLICY "Authenticated users can view donation receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'donation-receipts' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload donation receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'donation-receipts' AND auth.uid() IS NOT NULL);

-- Storage policies for adoption photos (public read)
CREATE POLICY "Anyone can view adoption photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'adoption-photos');

CREATE POLICY "Authenticated users can upload adoption photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'adoption-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own adoption photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'adoption-photos' AND auth.uid() IS NOT NULL);

-- Updated_at triggers
CREATE TRIGGER update_donation_campaigns_updated_at
  BEFORE UPDATE ON public.donation_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_adoption_posts_updated_at
  BEFORE UPDATE ON public.adoption_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
