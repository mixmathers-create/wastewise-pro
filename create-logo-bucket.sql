-- Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to read logos
CREATE POLICY "Allow public read access to logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

-- Create policy to allow admins to upload/update logos
CREATE POLICY "Allow admins to upload logos" ON storage.objects
  FOR INSERT TO authenticated 
  WITH CHECK (
    bucket_id = 'logos' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.user_type = 'admin'
    )
  );

-- Create policy to allow admins to update logos
CREATE POLICY "Allow admins to update logos" ON storage.objects
  FOR UPDATE TO authenticated 
  USING (
    bucket_id = 'logos' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.user_type = 'admin'
    )
  );