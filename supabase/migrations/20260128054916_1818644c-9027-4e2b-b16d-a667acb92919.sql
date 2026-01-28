-- Add structured date/time fields for care requests
ALTER TABLE public.care_requests
ADD COLUMN request_date date,
ADD COLUMN start_time time without time zone,
ADD COLUMN end_time time without time zone;

-- Add structured pay fields
ALTER TABLE public.care_requests
ADD COLUMN pay_amount numeric,
ADD COLUMN pay_currency text DEFAULT 'USD';

-- Add comment for clarity
COMMENT ON COLUMN public.care_requests.request_date IS 'The date of the care request';
COMMENT ON COLUMN public.care_requests.start_time IS 'Start time for the care';
COMMENT ON COLUMN public.care_requests.end_time IS 'End time for the care';
COMMENT ON COLUMN public.care_requests.pay_amount IS 'Numeric pay amount offered';
COMMENT ON COLUMN public.care_requests.pay_currency IS 'Currency code (e.g., USD, CAD, EUR)';