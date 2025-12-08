-- Add user_type to profiles table
ALTER TABLE profiles ADD COLUMN user_type TEXT DEFAULT 'admin' CHECK (user_type IN ('admin', 'mechanic', 'collector', 'hr'));

-- Update existing profiles to be admin by default
UPDATE profiles SET user_type = 'admin' WHERE user_type IS NULL;

-- Create RLS policies for role-based access
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid()::text 
    AND user_type = 'admin'
  )
);
CREATE POLICY "Admins can update profiles" ON profiles FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid()::text 
    AND user_type = 'admin'
  )
);