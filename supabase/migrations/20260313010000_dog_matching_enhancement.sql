
-- ==========================================
-- DOG MATCHING ENHANCEMENT MIGRATION
-- New columns and table for AI-powered
-- lost/found dog matching
-- ==========================================

-- 1. New columns on dogs table
ALTER TABLE public.dogs
  ADD COLUMN coat_shade TEXT,
  ADD COLUMN markings TEXT[],
  ADD COLUMN collar_description TEXT,
  ADD COLUMN visible_conditions TEXT,
  ADD COLUMN behavior_description TEXT,
  ADD COLUMN unique_traits TEXT[],
  ADD COLUMN verification_secret TEXT;

-- 2. New columns on found_dogs table
ALTER TABLE public.found_dogs
  ADD COLUMN ai_attributes JSONB DEFAULT '{}',
  ADD COLUMN finder_observations JSONB DEFAULT '{}',
  ADD COLUMN matched_alert_id UUID REFERENCES public.lost_alerts(id),
  ADD COLUMN confidence_level TEXT DEFAULT 'unprocessed'
    CHECK (confidence_level IN ('high', 'medium', 'low', 'unprocessed')),
  ADD COLUMN image_quality TEXT;

-- 3. New columns on lost_alerts table
ALTER TABLE public.lost_alerts
  ADD COLUMN last_seen_time TIMESTAMPTZ,
  ADD COLUMN search_radius_km NUMERIC;

-- 4. New table: dog_matches
CREATE TABLE public.dog_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  found_dog_id UUID NOT NULL REFERENCES public.found_dogs(id),
  lost_alert_id UUID NOT NULL REFERENCES public.lost_alerts(id),
  match_score NUMERIC NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  match_details JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'owner_confirmed', 'owner_rejected', 'finder_confirmed', 'verified', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on dog_matches
ALTER TABLE public.dog_matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dog_matches

-- Anyone can view matches (for now, to keep it simple)
CREATE POLICY "Anyone can view dog matches"
  ON public.dog_matches FOR SELECT
  USING (true);

-- Authenticated users can insert matches
CREATE POLICY "Authenticated users can create dog matches"
  ON public.dog_matches FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users involved in the match can update (lost alert owner or found dog reporter)
CREATE POLICY "Involved users can update dog matches"
  ON public.dog_matches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.lost_alerts la
      WHERE la.id = dog_matches.lost_alert_id AND la.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.found_dogs fd
      WHERE fd.id = dog_matches.found_dog_id AND fd.reporter_id = auth.uid()
    )
  );

-- updated_at trigger for dog_matches
CREATE TRIGGER update_dog_matches_updated_at
  BEFORE UPDATE ON public.dog_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Indexes
CREATE INDEX idx_dog_matches_found ON public.dog_matches(found_dog_id);
CREATE INDEX idx_dog_matches_lost ON public.dog_matches(lost_alert_id);
CREATE INDEX idx_found_dogs_status_created ON public.found_dogs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_lost_alerts_status ON public.lost_alerts(status);
