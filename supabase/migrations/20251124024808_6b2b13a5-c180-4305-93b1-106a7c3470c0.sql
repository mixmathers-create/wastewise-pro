-- Add leaves_available field to drivers table
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS leaves_available INTEGER DEFAULT 15;

-- Add leaves_available field to mechanics table
ALTER TABLE mechanics 
ADD COLUMN IF NOT EXISTS leaves_available INTEGER DEFAULT 15;