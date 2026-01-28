-- Create enum for record type
CREATE TYPE public.med_record_type AS ENUM ('vaccine', 'medication');

-- Create enum for duration unit
CREATE TYPE public.duration_unit AS ENUM ('days', 'months', 'years');

-- Create medication/vaccine records table
CREATE TABLE public.med_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  record_type public.med_record_type NOT NULL,
  date_given DATE NOT NULL,
  duration_value INTEGER NOT NULL,
  duration_unit public.duration_unit NOT NULL,
  expires_on DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.med_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own med records"
ON public.med_records
FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own med records"
ON public.med_records
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own med records"
ON public.med_records
FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own med records"
ON public.med_records
FOR DELETE
USING (auth.uid() = owner_id);

-- Create trigger for updated_at
CREATE TRIGGER update_med_records_updated_at
BEFORE UPDATE ON public.med_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();