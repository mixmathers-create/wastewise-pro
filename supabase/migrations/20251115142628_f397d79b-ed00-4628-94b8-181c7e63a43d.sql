-- Add capacity column to trucks table
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS capacity numeric DEFAULT 0;

-- Update existing trucks with capacity based on type
UPDATE trucks SET capacity = 4 WHERE type = 'GC';
UPDATE trucks SET capacity = 2 WHERE type = 'DT';

COMMENT ON COLUMN trucks.capacity IS 'Truck capacity in metric tons (MT)';