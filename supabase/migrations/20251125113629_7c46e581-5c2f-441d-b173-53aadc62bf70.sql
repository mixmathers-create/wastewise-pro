-- Create incident_reports table
CREATE TABLE public.incident_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  reported_by uuid NOT NULL,
  reporter_name text NOT NULL,
  incident_type text NOT NULL,
  incident_date date NOT NULL,
  incident_time time,
  location text,
  personnel_involved jsonb DEFAULT '[]'::jsonb,
  description text NOT NULL,
  severity text DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'resolved', 'closed')),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  attachments jsonb DEFAULT '[]'::jsonb
);

-- Create mechanical_reports table
CREATE TABLE public.mechanical_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  reported_by uuid NOT NULL,
  reporter_name text NOT NULL,
  truck_id uuid NOT NULL REFERENCES public.trucks(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  issue_description text NOT NULL,
  severity text DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'job_order_created', 'resolved')),
  truck_operational boolean DEFAULT true,
  symptoms jsonb DEFAULT '[]'::jsonb,
  mechanic_comments jsonb DEFAULT '[]'::jsonb,
  job_order_id uuid REFERENCES public.job_orders(id),
  reviewed_by uuid,
  reviewed_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mechanical_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for incident_reports
CREATE POLICY "All authenticated users can view incident reports"
  ON public.incident_reports FOR SELECT
  USING (true);

CREATE POLICY "All authenticated users can insert incident reports"
  ON public.incident_reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "All authenticated users can update incident reports"
  ON public.incident_reports FOR UPDATE
  USING (true);

CREATE POLICY "All authenticated users can delete incident reports"
  ON public.incident_reports FOR DELETE
  USING (true);

-- RLS Policies for mechanical_reports
CREATE POLICY "All authenticated users can view mechanical reports"
  ON public.mechanical_reports FOR SELECT
  USING (true);

CREATE POLICY "All authenticated users can insert mechanical reports"
  ON public.mechanical_reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "All authenticated users can update mechanical reports"
  ON public.mechanical_reports FOR UPDATE
  USING (true);

CREATE POLICY "All authenticated users can delete mechanical reports"
  ON public.mechanical_reports FOR DELETE
  USING (true);