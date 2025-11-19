-- Add status tracking for drivers and helpers
ALTER TABLE drivers 
ADD COLUMN status TEXT DEFAULT 'available' CHECK (status IN ('available', 'suspended', 'fired')),
ADD COLUMN suspension_start_date DATE,
ADD COLUMN suspension_end_date DATE;

ALTER TABLE helpers 
ADD COLUMN status TEXT DEFAULT 'available' CHECK (status IN ('available', 'suspended', 'fired')),
ADD COLUMN suspension_start_date DATE,
ADD COLUMN suspension_end_date DATE;

-- Add comments for clarity
COMMENT ON COLUMN drivers.status IS 'Employment status: available (can be scheduled), suspended (temporarily unavailable), fired (permanently unavailable)';
COMMENT ON COLUMN helpers.status IS 'Employment status: available (can be scheduled), suspended (temporarily unavailable), fired (permanently unavailable)';
COMMENT ON COLUMN drivers.suspension_start_date IS 'Start date of suspension period (only relevant when status is suspended)';
COMMENT ON COLUMN drivers.suspension_end_date IS 'End date of suspension period (only relevant when status is suspended)';
COMMENT ON COLUMN helpers.suspension_start_date IS 'Start date of suspension period (only relevant when status is suspended)';
COMMENT ON COLUMN helpers.suspension_end_date IS 'End date of suspension period (only relevant when status is suspended)';