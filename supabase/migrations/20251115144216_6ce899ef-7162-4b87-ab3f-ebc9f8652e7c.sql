-- Add schedule approval and MT requirement fields
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS mt_requirement numeric;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS approved_by text;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS signature_data text;

-- Drop existing check constraint if it exists
ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_status_check;

-- Add new check constraint with expanded status values
ALTER TABLE schedules ADD CONSTRAINT schedules_status_check 
  CHECK (status IN ('draft', 'pending_approval', 'approved', 'scheduled', 'completed', 'cancelled'));

-- Add comments
COMMENT ON COLUMN schedules.mt_requirement IS 'Metric tons requirement for this shift';
COMMENT ON COLUMN schedules.approved_by IS 'User who approved this schedule';
COMMENT ON COLUMN schedules.approved_at IS 'Timestamp when schedule was approved';
COMMENT ON COLUMN schedules.signature_data IS 'Digital signature data for approval';