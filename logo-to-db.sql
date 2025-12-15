-- Create app_settings table to store logo and other app configurations
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read settings
CREATE POLICY "Allow authenticated users to read app settings" ON app_settings
  FOR SELECT TO authenticated USING (true);

-- Create policy to allow only admins to update settings
CREATE POLICY "Allow admins to update app settings" ON app_settings
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.user_type = 'admin'
    )
  );

-- Insert default logo setting (you can update this with actual logo URL)
INSERT INTO app_settings (key, value) 
VALUES ('company_logo', '/logo.png')
ON CONFLICT (key) DO NOTHING;

-- Insert other default settings
INSERT INTO app_settings (key, value) VALUES 
  ('company_name', 'WasteWise Pro'),
  ('company_address', ''),
  ('company_phone', ''),
  ('company_email', '')
ON CONFLICT (key) DO NOTHING;