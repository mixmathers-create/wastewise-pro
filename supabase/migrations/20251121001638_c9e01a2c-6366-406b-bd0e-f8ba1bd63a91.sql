-- Add photo_url columns to helpers and mechanics tables
ALTER TABLE helpers ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE mechanics ADD COLUMN IF NOT EXISTS photo_url text;

-- Add storage bucket for personnel photos if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('personnel-photos', 'personnel-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for personnel photos
CREATE POLICY "Authenticated users can view personnel photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'personnel-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload personnel photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'personnel-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update personnel photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'personnel-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete personnel photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'personnel-photos' AND auth.role() = 'authenticated');