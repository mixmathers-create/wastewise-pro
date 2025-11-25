-- Add team_id to user_roles if not exists (checking structure from get_user_team_id function)
-- The function suggests team_id already exists, so we'll add it to other tables

-- Add team_id to drivers table
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS team_id UUID;

-- Add team_id to helpers table
ALTER TABLE public.helpers
ADD COLUMN IF NOT EXISTS team_id UUID;

-- Add team_id to trucks table
ALTER TABLE public.trucks
ADD COLUMN IF NOT EXISTS team_id UUID;

-- Add team_id to personnel_time_logs table
ALTER TABLE public.personnel_time_logs
ADD COLUMN IF NOT EXISTS team_id UUID;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_drivers_team ON public.drivers(team_id);
CREATE INDEX IF NOT EXISTS idx_helpers_team ON public.helpers(team_id);
CREATE INDEX IF NOT EXISTS idx_trucks_team ON public.trucks(team_id);
CREATE INDEX IF NOT EXISTS idx_personnel_time_logs_team ON public.personnel_time_logs(team_id);

-- Update RLS policies for drivers to filter by team
DROP POLICY IF EXISTS "All authenticated users can view drivers" ON public.drivers;
CREATE POLICY "Users can view drivers in their team"
ON public.drivers
FOR SELECT
TO authenticated
USING (
  team_id IS NULL OR 
  team_id = public.get_user_team_id(auth.uid())
);

DROP POLICY IF EXISTS "All authenticated users can insert drivers" ON public.drivers;
CREATE POLICY "Users can insert drivers in their team"
ON public.drivers
FOR INSERT
TO authenticated
WITH CHECK (
  team_id = public.get_user_team_id(auth.uid())
);

DROP POLICY IF EXISTS "All authenticated users can update drivers" ON public.drivers;
CREATE POLICY "Users can update drivers in their team"
ON public.drivers
FOR UPDATE
TO authenticated
USING (
  team_id IS NULL OR 
  team_id = public.get_user_team_id(auth.uid())
);

DROP POLICY IF EXISTS "All authenticated users can delete drivers" ON public.drivers;
CREATE POLICY "Users can delete drivers in their team"
ON public.drivers
FOR DELETE
TO authenticated
USING (
  team_id IS NULL OR 
  team_id = public.get_user_team_id(auth.uid())
);

-- Update RLS policies for helpers to filter by team
DROP POLICY IF EXISTS "All authenticated users can view helpers" ON public.helpers;
CREATE POLICY "Users can view helpers in their team"
ON public.helpers
FOR SELECT
TO authenticated
USING (
  team_id IS NULL OR 
  team_id = public.get_user_team_id(auth.uid())
);

DROP POLICY IF EXISTS "All authenticated users can insert helpers" ON public.helpers;
CREATE POLICY "Users can insert helpers in their team"
ON public.helpers
FOR INSERT
TO authenticated
WITH CHECK (
  team_id = public.get_user_team_id(auth.uid())
);

DROP POLICY IF EXISTS "All authenticated users can update helpers" ON public.helpers;
CREATE POLICY "Users can update helpers in their team"
ON public.helpers
FOR UPDATE
TO authenticated
USING (
  team_id IS NULL OR 
  team_id = public.get_user_team_id(auth.uid())
);

DROP POLICY IF EXISTS "All authenticated users can delete helpers" ON public.helpers;
CREATE POLICY "Users can delete helpers in their team"
ON public.helpers
FOR DELETE
TO authenticated
USING (
  team_id IS NULL OR 
  team_id = public.get_user_team_id(auth.uid())
);

-- Update RLS policies for trucks to filter by team
DROP POLICY IF EXISTS "All authenticated users can view trucks" ON public.trucks;
CREATE POLICY "Users can view trucks in their team"
ON public.trucks
FOR SELECT
TO authenticated
USING (
  team_id IS NULL OR 
  team_id = public.get_user_team_id(auth.uid())
);

DROP POLICY IF EXISTS "All authenticated users can insert trucks" ON public.trucks;
CREATE POLICY "Users can insert trucks in their team"
ON public.trucks
FOR INSERT
TO authenticated
WITH CHECK (
  team_id = public.get_user_team_id(auth.uid())
);

DROP POLICY IF EXISTS "All authenticated users can update trucks" ON public.trucks;
CREATE POLICY "Users can update trucks in their team"
ON public.trucks
FOR UPDATE
TO authenticated
USING (
  team_id IS NULL OR 
  team_id = public.get_user_team_id(auth.uid())
);

DROP POLICY IF EXISTS "All authenticated users can delete trucks" ON public.trucks;
CREATE POLICY "Users can delete trucks in their team"
ON public.trucks
FOR DELETE
TO authenticated
USING (
  team_id IS NULL OR 
  team_id = public.get_user_team_id(auth.uid())
);

-- Update RLS policies for personnel_time_logs to filter by team
DROP POLICY IF EXISTS "All authenticated users can view time logs" ON public.personnel_time_logs;
CREATE POLICY "Users can view time logs in their team"
ON public.personnel_time_logs
FOR SELECT
TO authenticated
USING (
  team_id IS NULL OR 
  team_id = public.get_user_team_id(auth.uid())
);

DROP POLICY IF EXISTS "All authenticated users can insert time logs" ON public.personnel_time_logs;
CREATE POLICY "Users can insert time logs in their team"
ON public.personnel_time_logs
FOR INSERT
TO authenticated
WITH CHECK (
  team_id = public.get_user_team_id(auth.uid())
);

DROP POLICY IF EXISTS "All authenticated users can update time logs" ON public.personnel_time_logs;
CREATE POLICY "Users can update time logs in their team"
ON public.personnel_time_logs
FOR UPDATE
TO authenticated
USING (
  team_id IS NULL OR 
  team_id = public.get_user_team_id(auth.uid())
);

DROP POLICY IF EXISTS "All authenticated users can delete time logs" ON public.personnel_time_logs;
CREATE POLICY "Users can delete time logs in their team"
ON public.personnel_time_logs
FOR DELETE
TO authenticated
USING (
  team_id IS NULL OR 
  team_id = public.get_user_team_id(auth.uid())
);

-- Create a trigger function to automatically set team_id on insert
CREATE OR REPLACE FUNCTION public.set_team_id_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.team_id IS NULL THEN
    NEW.team_id := public.get_user_team_id(auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

-- Apply trigger to drivers table
DROP TRIGGER IF EXISTS set_drivers_team_id ON public.drivers;
CREATE TRIGGER set_drivers_team_id
  BEFORE INSERT ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_team_id_from_auth();

-- Apply trigger to helpers table
DROP TRIGGER IF EXISTS set_helpers_team_id ON public.helpers;
CREATE TRIGGER set_helpers_team_id
  BEFORE INSERT ON public.helpers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_team_id_from_auth();

-- Apply trigger to trucks table
DROP TRIGGER IF EXISTS set_trucks_team_id ON public.trucks;
CREATE TRIGGER set_trucks_team_id
  BEFORE INSERT ON public.trucks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_team_id_from_auth();

-- Apply trigger to personnel_time_logs table
DROP TRIGGER IF EXISTS set_personnel_time_logs_team_id ON public.personnel_time_logs;
CREATE TRIGGER set_personnel_time_logs_team_id
  BEFORE INSERT ON public.personnel_time_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_team_id_from_auth();