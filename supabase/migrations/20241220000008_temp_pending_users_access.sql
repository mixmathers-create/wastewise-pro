-- Temporarily allow all authenticated users to view pending users for debugging
DROP POLICY IF EXISTS "Admins can view all pending users" ON pending_users;

CREATE POLICY "Temp: All authenticated users can view pending users" ON pending_users
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Also allow all authenticated users to update for approval/rejection
DROP POLICY IF EXISTS "Admins can update pending users" ON pending_users;

CREATE POLICY "Temp: All authenticated users can update pending users" ON pending_users
FOR UPDATE USING (auth.uid() IS NOT NULL);