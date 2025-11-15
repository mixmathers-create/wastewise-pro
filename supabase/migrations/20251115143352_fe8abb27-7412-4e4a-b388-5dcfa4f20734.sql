-- Create table for truck maintenance/downtime blocks
CREATE TABLE IF NOT EXISTS truck_maintenance_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id UUID NOT NULL REFERENCES trucks(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date),
  CONSTRAINT max_30_days CHECK (end_date - start_date <= 30)
);

-- Enable RLS
ALTER TABLE truck_maintenance_blocks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "All authenticated users can view maintenance blocks"
ON truck_maintenance_blocks FOR SELECT
USING (true);

CREATE POLICY "All authenticated users can insert maintenance blocks"
ON truck_maintenance_blocks FOR INSERT
WITH CHECK (true);

CREATE POLICY "All authenticated users can update maintenance blocks"
ON truck_maintenance_blocks FOR UPDATE
USING (true);

CREATE POLICY "All authenticated users can delete maintenance blocks"
ON truck_maintenance_blocks FOR DELETE
USING (true);

-- Create index for faster queries
CREATE INDEX idx_truck_maintenance_dates ON truck_maintenance_blocks(truck_id, start_date, end_date);

COMMENT ON TABLE truck_maintenance_blocks IS 'Tracks scheduled maintenance and downtime periods for trucks';
COMMENT ON COLUMN truck_maintenance_blocks.start_date IS 'Start date of maintenance period';
COMMENT ON COLUMN truck_maintenance_blocks.end_date IS 'End date of maintenance period (max 30 days from start)';
COMMENT ON COLUMN truck_maintenance_blocks.reason IS 'Reason for maintenance/downtime';