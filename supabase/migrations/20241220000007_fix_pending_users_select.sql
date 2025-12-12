-- Drop existing select policy
DROP POLICY IF EXISTS "Admins can view all pending users" ON pending_users;

-- Create new policy that works with current profile structure
CREATE POLICY "Admins can view all pending users" ON pending_users
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.user_type = 'admin' OR profiles.role = 'admin')
  )
);