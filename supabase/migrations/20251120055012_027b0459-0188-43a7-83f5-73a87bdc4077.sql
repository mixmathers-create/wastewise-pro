-- Add columns to schedules table for special dispatch tracking
ALTER TABLE schedules
ADD COLUMN IF NOT EXISTS is_special_dispatch boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS client_mt_allocations jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN schedules.is_special_dispatch IS 'Flag to indicate if this is a special dispatch schedule';
COMMENT ON COLUMN schedules.client_mt_allocations IS 'Array of {client_id, mt_requirement, allocated_mt} for special dispatch schedules';

-- Create a table for scheduling parameters
CREATE TABLE IF NOT EXISTS scheduling_parameters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parameter_key text NOT NULL UNIQUE,
  parameter_value jsonb NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE scheduling_parameters ENABLE ROW LEVEL SECURITY;

-- Create policies for scheduling_parameters
CREATE POLICY "All authenticated users can view scheduling parameters"
  ON scheduling_parameters FOR SELECT
  USING (true);

CREATE POLICY "All authenticated users can insert scheduling parameters"
  ON scheduling_parameters FOR INSERT
  WITH CHECK (true);

CREATE POLICY "All authenticated users can update scheduling parameters"
  ON scheduling_parameters FOR UPDATE
  USING (true);

CREATE POLICY "All authenticated users can delete scheduling parameters"
  ON scheduling_parameters FOR DELETE
  USING (true);

-- Insert default scheduling parameters
INSERT INTO scheduling_parameters (parameter_key, parameter_value, description)
VALUES 
  ('regular_schedule_max_clients_per_truck', '{"value": 10}'::jsonb, 'Maximum number of clients assigned to a single truck in regular schedules'),
  ('regular_schedule_capacity_buffer', '{"value": 0.1}'::jsonb, 'Buffer percentage (0.1 = 10%) to leave in truck capacity for regular schedules'),
  ('special_dispatch_capacity_buffer', '{"value": 0.05}'::jsonb, 'Buffer percentage (0.05 = 5%) to leave in truck capacity for special dispatch'),
  ('special_dispatch_multi_truck_threshold', '{"value": 0.8}'::jsonb, 'Threshold (0.8 = 80%) of remaining capacity before allowing multi-truck assignment for one client')
ON CONFLICT (parameter_key) DO NOTHING;