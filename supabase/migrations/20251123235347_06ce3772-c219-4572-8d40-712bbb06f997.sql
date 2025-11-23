-- Create leaves table
CREATE TABLE public.leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_type text NOT NULL, -- 'driver', 'helper', 'mechanic'
  personnel_id uuid NOT NULL,
  personnel_name text NOT NULL,
  personnel_id_number text NOT NULL,
  leave_type text NOT NULL, -- 'sick', 'vacation', 'emergency', 'medical', 'personal'
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL,
  medical_certificate_url text,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamp with time zone,
  review_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "All authenticated users can view leaves"
  ON public.leaves FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can insert leaves"
  ON public.leaves FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "All authenticated users can update leaves"
  ON public.leaves FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can delete leaves"
  ON public.leaves FOR DELETE
  TO authenticated
  USING (true);

-- Create index for better performance
CREATE INDEX idx_leaves_personnel ON public.leaves(personnel_type, personnel_id);
CREATE INDEX idx_leaves_status ON public.leaves(status);