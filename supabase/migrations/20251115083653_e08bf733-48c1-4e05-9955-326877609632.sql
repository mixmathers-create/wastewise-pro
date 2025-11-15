-- Create teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table with team relationship
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  qr_code TEXT NOT NULL UNIQUE,
  contact_info TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trucks table
CREATE TABLE public.trucks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('GC1', 'GC2', 'GC3', 'GC4', 'GC5', 'GC6', 'DT')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create drivers table
CREATE TABLE public.drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  license_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create helpers table
CREATE TABLE public.helpers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create collection_receipts table
CREATE TABLE public.collection_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  truck_id UUID NOT NULL REFERENCES public.trucks(id),
  driver_id UUID NOT NULL REFERENCES public.drivers(id),
  helper_ids UUID[] NOT NULL,
  items JSONB NOT NULL,
  waste_types TEXT[] NOT NULL,
  signature_data TEXT,
  signed_by TEXT,
  qr_code TEXT NOT NULL UNIQUE,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams
CREATE POLICY "Users can view their own team"
  ON public.teams FOR SELECT
  USING (id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid()));

-- RLS Policies for profiles
CREATE POLICY "Users can view profiles in their team"
  ON public.profiles FOR SELECT
  USING (team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for clients
CREATE POLICY "Users can view clients in their team"
  ON public.clients FOR SELECT
  USING (team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can insert clients"
  ON public.clients FOR INSERT
  WITH CHECK (team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update clients"
  ON public.clients FOR UPDATE
  USING (team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete clients"
  ON public.clients FOR DELETE
  USING (team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- RLS Policies for trucks
CREATE POLICY "Users can view trucks in their team"
  ON public.trucks FOR SELECT
  USING (team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can insert trucks"
  ON public.trucks FOR INSERT
  WITH CHECK (team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update trucks"
  ON public.trucks FOR UPDATE
  USING (team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete trucks"
  ON public.trucks FOR DELETE
  USING (team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- RLS Policies for drivers
CREATE POLICY "Users can view drivers in their team"
  ON public.drivers FOR SELECT
  USING (team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can insert drivers"
  ON public.drivers FOR INSERT
  WITH CHECK (team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update drivers"
  ON public.drivers FOR UPDATE
  USING (team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete drivers"
  ON public.drivers FOR DELETE
  USING (team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- RLS Policies for helpers
CREATE POLICY "Users can view helpers in their team"
  ON public.helpers FOR SELECT
  USING (team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can insert helpers"
  ON public.helpers FOR INSERT
  WITH CHECK (team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update helpers"
  ON public.helpers FOR UPDATE
  USING (team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete helpers"
  ON public.helpers FOR DELETE
  USING (team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- RLS Policies for collection_receipts
CREATE POLICY "Users can view receipts in their team"
  ON public.collection_receipts FOR SELECT
  USING (team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert receipts"
  ON public.collection_receipts FOR INSERT
  WITH CHECK (
    team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update their own receipts"
  ON public.collection_receipts FOR UPDATE
  USING (created_by = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_team_id ON public.profiles(team_id);
CREATE INDEX idx_clients_team_id ON public.clients(team_id);
CREATE INDEX idx_clients_qr_code ON public.clients(qr_code);
CREATE INDEX idx_trucks_team_id ON public.trucks(team_id);
CREATE INDEX idx_drivers_team_id ON public.drivers(team_id);
CREATE INDEX idx_helpers_team_id ON public.helpers(team_id);
CREATE INDEX idx_collection_receipts_team_id ON public.collection_receipts(team_id);
CREATE INDEX idx_collection_receipts_qr_code ON public.collection_receipts(qr_code);
CREATE INDEX idx_collection_receipts_created_at ON public.collection_receipts(created_at DESC);