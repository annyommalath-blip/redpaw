
-- Category enum
CREATE TYPE public.spot_category AS ENUM ('food_drink', 'shops_malls', 'outdoor_stays', 'pet_services');

-- Status enum (for moderation / closure later)
CREATE TYPE public.spot_status AS ENUM ('active', 'closed', 'flagged');

-- Pet-friendly spots
CREATE TABLE public.pet_spots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  name text NOT NULL,
  category spot_category NOT NULL,
  description text,
  location_label text NOT NULL,
  latitude double precision,
  longitude double precision,
  photo_urls text[] NOT NULL DEFAULT '{}',
  contact_phone text,
  website text,
  opening_hours text,
  offers_bookings boolean NOT NULL DEFAULT false,
  status spot_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pet_spots_category ON public.pet_spots(category);
CREATE INDEX idx_pet_spots_status ON public.pet_spots(status);
CREATE INDEX idx_pet_spots_location ON public.pet_spots(latitude, longitude);

ALTER TABLE public.pet_spots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active spots"
ON public.pet_spots FOR SELECT
USING (status = 'active' OR auth.uid() = created_by);

CREATE POLICY "Signed-in users can create spots"
ON public.pet_spots FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their spots"
ON public.pet_spots FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete their spots"
ON public.pet_spots FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

CREATE TRIGGER update_pet_spots_updated_at
BEFORE UPDATE ON public.pet_spots
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Spot reviews
CREATE TABLE public.spot_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id uuid NOT NULL REFERENCES public.pet_spots(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (spot_id, user_id)
);

CREATE INDEX idx_spot_reviews_spot ON public.spot_reviews(spot_id);

ALTER TABLE public.spot_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view spot reviews"
ON public.spot_reviews FOR SELECT
USING (true);

CREATE POLICY "Signed-in users can create reviews"
ON public.spot_reviews FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors can update their reviews"
ON public.spot_reviews FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authors can delete their reviews"
ON public.spot_reviews FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_spot_reviews_updated_at
BEFORE UPDATE ON public.spot_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for spot photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('spot-photos', 'spot-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view spot photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'spot-photos');

CREATE POLICY "Signed-in users can upload spot photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'spot-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own spot photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'spot-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own spot photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'spot-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
