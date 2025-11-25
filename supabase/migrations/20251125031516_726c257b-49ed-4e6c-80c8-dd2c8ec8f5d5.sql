-- Create personnel time logs table for drivers, helpers, and potentially other personnel
CREATE TABLE IF NOT EXISTS public.personnel_time_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  personnel_id UUID NOT NULL,
  personnel_type TEXT NOT NULL CHECK (personnel_type IN ('driver', 'helper', 'mechanic', 'recycler', 'management')),
  personnel_name TEXT NOT NULL,
  time_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  time_out TIMESTAMP WITH TIME ZONE,
  photo_url TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  group_session_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.personnel_time_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "All authenticated users can view time logs"
ON public.personnel_time_logs
FOR SELECT
USING (true);

CREATE POLICY "All authenticated users can insert time logs"
ON public.personnel_time_logs
FOR INSERT
WITH CHECK (true);

CREATE POLICY "All authenticated users can update time logs"
ON public.personnel_time_logs
FOR UPDATE
USING (true);

CREATE POLICY "All authenticated users can delete time logs"
ON public.personnel_time_logs
FOR DELETE
USING (true);

-- Create index for faster queries
CREATE INDEX idx_personnel_time_logs_session ON public.personnel_time_logs(group_session_id);
CREATE INDEX idx_personnel_time_logs_personnel ON public.personnel_time_logs(personnel_id, personnel_type);
CREATE INDEX idx_personnel_time_logs_time_in ON public.personnel_time_logs(time_in DESC);