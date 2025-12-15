-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can register" ON pending_users;

-- Create new policy that allows insert without auth
CREATE POLICY "Allow registration without auth" ON pending_users
FOR INSERT WITH CHECK (true);