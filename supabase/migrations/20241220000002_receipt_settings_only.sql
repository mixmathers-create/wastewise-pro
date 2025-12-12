-- Create receipt settings table for database storage
CREATE TABLE IF NOT EXISTS receipt_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default row if none exists
INSERT INTO receipt_settings (logo_url) 
SELECT NULL 
WHERE NOT EXISTS (SELECT 1 FROM receipt_settings);