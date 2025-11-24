-- Create recyclers table
CREATE TABLE IF NOT EXISTS public.recyclers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_number TEXT,
  address TEXT,
  leaves_available INTEGER DEFAULT 15,
  status TEXT DEFAULT 'available',
  photo_url TEXT,
  id_number TEXT,
  birthdate DATE,
  availability JSONB DEFAULT '{"days": ["Mon", "Tue", "Wed", "Thu", "Fri"], "shifts": ["AM", "PM"]}'::jsonb,
  suspension_start_date DATE,
  suspension_end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create management table
CREATE TABLE IF NOT EXISTS public.management (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_number TEXT,
  address TEXT,
  leaves_available INTEGER DEFAULT 15,
  status TEXT DEFAULT 'available',
  photo_url TEXT,
  id_number TEXT,
  birthdate DATE,
  availability JSONB DEFAULT '{"days": ["Mon", "Tue", "Wed", "Thu", "Fri"], "shifts": ["AM", "PM"]}'::jsonb,
  suspension_start_date DATE,
  suspension_end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recyclers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.management ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for recyclers
CREATE POLICY "All authenticated users can view recyclers"
ON public.recyclers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "All authenticated users can insert recyclers"
ON public.recyclers FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "All authenticated users can update recyclers"
ON public.recyclers FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "All authenticated users can delete recyclers"
ON public.recyclers FOR DELETE
TO authenticated
USING (true);

-- Create RLS policies for management
CREATE POLICY "All authenticated users can view management"
ON public.management FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "All authenticated users can insert management"
ON public.management FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "All authenticated users can update management"
ON public.management FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "All authenticated users can delete management"
ON public.management FOR DELETE
TO authenticated
USING (true);