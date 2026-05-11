-- Add pet_type to dogs (the user's own pets) and found_dogs (reports of strays)
ALTER TABLE public.dogs
  ADD COLUMN IF NOT EXISTS pet_type text NOT NULL DEFAULT 'dog';

ALTER TABLE public.found_dogs
  ADD COLUMN IF NOT EXISTS pet_type text NOT NULL DEFAULT 'dog';

-- Backfill is implicit via DEFAULT; existing rows become 'dog'.

-- Light validation: keep it permissive (we allow free text via 'other'),
-- but ensure non-empty.
ALTER TABLE public.dogs
  ADD CONSTRAINT dogs_pet_type_nonempty CHECK (length(trim(pet_type)) > 0);

ALTER TABLE public.found_dogs
  ADD CONSTRAINT found_dogs_pet_type_nonempty CHECK (length(trim(pet_type)) > 0);

-- Indexes for filtering by species in feeds/maps
CREATE INDEX IF NOT EXISTS idx_dogs_pet_type ON public.dogs (pet_type);
CREATE INDEX IF NOT EXISTS idx_found_dogs_pet_type ON public.found_dogs (pet_type);