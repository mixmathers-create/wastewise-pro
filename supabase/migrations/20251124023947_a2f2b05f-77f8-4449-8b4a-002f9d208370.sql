-- Add address and leaves_available fields to helpers table
ALTER TABLE helpers 
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS leaves_available integer DEFAULT 15;