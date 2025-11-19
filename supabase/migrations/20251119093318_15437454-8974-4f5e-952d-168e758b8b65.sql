-- Create mechanics table
CREATE TABLE public.mechanics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  id_number TEXT,
  contact_number TEXT,
  birthdate DATE,
  status TEXT DEFAULT 'available',
  availability JSONB DEFAULT '{"days": ["Mon", "Tue", "Wed", "Thu", "Fri"], "shifts": ["AM", "PM"]}'::jsonb,
  suspension_start_date DATE,
  suspension_end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mechanic_time_logs table
CREATE TABLE public.mechanic_time_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mechanic_id UUID NOT NULL REFERENCES public.mechanics(id) ON DELETE CASCADE,
  time_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  time_out TIMESTAMP WITH TIME ZONE,
  photo_url TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tools table
CREATE TABLE public.tools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  category TEXT,
  status TEXT DEFAULT 'available',
  condition TEXT DEFAULT 'good',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tool_checkouts table
CREATE TABLE public.tool_checkouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_id UUID NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  mechanic_id UUID NOT NULL REFERENCES public.mechanics(id) ON DELETE CASCADE,
  checked_out_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  checked_in_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'checked_out',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create job_orders table
CREATE TABLE public.job_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_number TEXT NOT NULL UNIQUE,
  mechanic_id UUID REFERENCES public.mechanics(id) ON DELETE SET NULL,
  truck_id UUID REFERENCES public.trucks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  scheduled_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mechanics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mechanic_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mechanics
CREATE POLICY "All authenticated users can view mechanics" ON public.mechanics FOR SELECT USING (true);
CREATE POLICY "All authenticated users can insert mechanics" ON public.mechanics FOR INSERT WITH CHECK (true);
CREATE POLICY "All authenticated users can update mechanics" ON public.mechanics FOR UPDATE USING (true);
CREATE POLICY "All authenticated users can delete mechanics" ON public.mechanics FOR DELETE USING (true);

-- RLS Policies for mechanic_time_logs
CREATE POLICY "All authenticated users can view time logs" ON public.mechanic_time_logs FOR SELECT USING (true);
CREATE POLICY "All authenticated users can insert time logs" ON public.mechanic_time_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "All authenticated users can update time logs" ON public.mechanic_time_logs FOR UPDATE USING (true);
CREATE POLICY "All authenticated users can delete time logs" ON public.mechanic_time_logs FOR DELETE USING (true);

-- RLS Policies for tools
CREATE POLICY "All authenticated users can view tools" ON public.tools FOR SELECT USING (true);
CREATE POLICY "All authenticated users can insert tools" ON public.tools FOR INSERT WITH CHECK (true);
CREATE POLICY "All authenticated users can update tools" ON public.tools FOR UPDATE USING (true);
CREATE POLICY "All authenticated users can delete tools" ON public.tools FOR DELETE USING (true);

-- RLS Policies for tool_checkouts
CREATE POLICY "All authenticated users can view checkouts" ON public.tool_checkouts FOR SELECT USING (true);
CREATE POLICY "All authenticated users can insert checkouts" ON public.tool_checkouts FOR INSERT WITH CHECK (true);
CREATE POLICY "All authenticated users can update checkouts" ON public.tool_checkouts FOR UPDATE USING (true);
CREATE POLICY "All authenticated users can delete checkouts" ON public.tool_checkouts FOR DELETE USING (true);

-- RLS Policies for job_orders
CREATE POLICY "All authenticated users can view job orders" ON public.job_orders FOR SELECT USING (true);
CREATE POLICY "All authenticated users can insert job orders" ON public.job_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "All authenticated users can update job orders" ON public.job_orders FOR UPDATE USING (true);
CREATE POLICY "All authenticated users can delete job orders" ON public.job_orders FOR DELETE USING (true);