-- Change mechanic_id to mechanic_ids (array) in job_orders table
ALTER TABLE job_orders 
  ADD COLUMN mechanic_ids uuid[] DEFAULT ARRAY[]::uuid[];

-- Migrate existing mechanic_id data to mechanic_ids array
UPDATE job_orders 
  SET mechanic_ids = ARRAY[mechanic_id]::uuid[]
  WHERE mechanic_id IS NOT NULL;

-- Drop the old mechanic_id column
ALTER TABLE job_orders 
  DROP COLUMN mechanic_id;