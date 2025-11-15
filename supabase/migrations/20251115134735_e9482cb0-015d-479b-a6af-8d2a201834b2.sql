-- Remove team_id from all tables and drop teams table
-- First, drop foreign key constraints
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_team_id_fkey;
ALTER TABLE collection_receipts DROP CONSTRAINT IF EXISTS collection_receipts_team_id_fkey;
ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_team_id_fkey;
ALTER TABLE helpers DROP CONSTRAINT IF EXISTS helpers_team_id_fkey;
ALTER TABLE trucks DROP CONSTRAINT IF EXISTS trucks_team_id_fkey;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_team_id_fkey;
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_team_id_fkey;

-- Remove team_id columns
ALTER TABLE clients DROP COLUMN IF EXISTS team_id;
ALTER TABLE collection_receipts DROP COLUMN IF EXISTS team_id;
ALTER TABLE drivers DROP COLUMN IF EXISTS team_id;
ALTER TABLE helpers DROP COLUMN IF EXISTS team_id;
ALTER TABLE trucks DROP COLUMN IF EXISTS team_id;
ALTER TABLE profiles DROP COLUMN IF EXISTS team_id;
ALTER TABLE user_roles DROP COLUMN IF EXISTS team_id;

-- Drop teams table
DROP TABLE IF EXISTS teams CASCADE;

-- Add availability columns for scheduling
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS availability jsonb DEFAULT '{"shifts": ["AM", "PM"], "days": ["Mon", "Tue", "Wed", "Thu", "Fri"]}';
ALTER TABLE helpers ADD COLUMN IF NOT EXISTS availability jsonb DEFAULT '{"shifts": ["AM", "PM"], "days": ["Mon", "Tue", "Wed", "Thu", "Fri"]}';
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS status text DEFAULT 'available';

-- Create schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  shift text NOT NULL CHECK (shift IN ('AM', 'PM')),
  driver_id uuid REFERENCES drivers(id) ON DELETE CASCADE,
  helper_ids uuid[] NOT NULL DEFAULT '{}',
  truck_id uuid REFERENCES trucks(id) ON DELETE CASCADE,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on schedules
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Create policy for schedules
CREATE POLICY "All authenticated users can manage schedules" ON schedules
  FOR ALL USING (true) WITH CHECK (true);

-- Insert seed availability data for drivers
UPDATE drivers SET availability = 
  CASE 
    WHEN name LIKE '%Juan%' THEN '{"shifts": ["AM"], "days": ["Mon", "Wed", "Fri"]}'::jsonb
    WHEN name LIKE '%Maria%' THEN '{"shifts": ["PM"], "days": ["Tue", "Thu", "Sat"]}'::jsonb
    WHEN name LIKE '%Pedro%' THEN '{"shifts": ["AM", "PM"], "days": ["Mon", "Tue", "Wed", "Thu", "Fri"]}'::jsonb
    ELSE '{"shifts": ["AM", "PM"], "days": ["Mon", "Tue", "Wed", "Thu", "Fri"]}'::jsonb
  END;

-- Insert seed availability data for helpers
UPDATE helpers SET availability = 
  CASE 
    WHEN name LIKE '%Carlos%' THEN '{"shifts": ["AM"], "days": ["Mon", "Wed", "Fri"]}'::jsonb
    WHEN name LIKE '%Rosa%' THEN '{"shifts": ["PM"], "days": ["Tue", "Thu", "Sat"]}'::jsonb
    WHEN name LIKE '%Luis%' THEN '{"shifts": ["AM"], "days": ["Tue", "Thu", "Sat"]}'::jsonb
    ELSE '{"shifts": ["AM", "PM"], "days": ["Mon", "Tue", "Wed", "Thu", "Fri"]}'::jsonb
  END;