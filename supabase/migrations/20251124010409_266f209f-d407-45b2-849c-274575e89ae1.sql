-- Add mechanic_id column to equipment_checkouts table
ALTER TABLE equipment_checkouts
ADD COLUMN mechanic_id uuid REFERENCES mechanics(id);

-- Update existing RLS policies remain the same as they allow all authenticated users