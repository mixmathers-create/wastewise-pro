-- Create storage bucket for driver licenses
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-licenses', 'driver-licenses', false);

-- Create RLS policies for driver licenses bucket
CREATE POLICY "Authenticated users can view driver licenses"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'driver-licenses');

CREATE POLICY "Authenticated users can upload driver licenses"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'driver-licenses');

CREATE POLICY "Authenticated users can update driver licenses"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'driver-licenses');

CREATE POLICY "Authenticated users can delete driver licenses"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'driver-licenses');

-- Add license file URL and expiry date to drivers table
ALTER TABLE drivers
ADD COLUMN license_file_url TEXT,
ADD COLUMN license_expiry_date DATE;

-- Create index for efficient expiry date queries
CREATE INDEX idx_drivers_license_expiry ON drivers(license_expiry_date);

-- Create function to get drivers with expiring licenses (within 30 days)
CREATE OR REPLACE FUNCTION public.get_expiring_licenses()
RETURNS TABLE (
  id UUID,
  name TEXT,
  license_number TEXT,
  license_expiry_date DATE,
  days_until_expiry INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    name,
    license_number,
    license_expiry_date,
    (license_expiry_date - CURRENT_DATE) as days_until_expiry
  FROM drivers
  WHERE license_expiry_date IS NOT NULL
    AND license_expiry_date >= CURRENT_DATE
    AND license_expiry_date <= CURRENT_DATE + INTERVAL '30 days'
  ORDER BY license_expiry_date ASC;
$$;