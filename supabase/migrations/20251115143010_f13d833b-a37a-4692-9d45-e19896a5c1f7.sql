-- Add is_backup column to schedules table
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS is_backup boolean DEFAULT false;

COMMENT ON COLUMN schedules.is_backup IS 'Indicates if this is a backup driver/helper assignment (for deployments with >5 trucks)';