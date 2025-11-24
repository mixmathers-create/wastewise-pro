-- Create table for third-party services on job orders
CREATE TABLE public.job_order_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_order_id UUID NOT NULL,
  service_type TEXT NOT NULL,
  category TEXT NOT NULL,
  provider_name TEXT,
  description TEXT,
  cost NUMERIC,
  cost_added_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.job_order_services ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "All authenticated users can view services"
  ON public.job_order_services FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "All authenticated users can insert services"
  ON public.job_order_services FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "All authenticated users can update services"
  ON public.job_order_services FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "All authenticated users can delete services"
  ON public.job_order_services FOR DELETE
  TO authenticated USING (true);

-- Create index for faster lookups
CREATE INDEX idx_job_order_services_job_order_id ON public.job_order_services(job_order_id);