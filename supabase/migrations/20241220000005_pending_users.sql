  -- Create pending users table for approval workflow
  CREATE TABLE IF NOT EXISTS pending_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    user_type TEXT NOT NULL CHECK (user_type IN ('admin', 'hr', 'mechanic', 'driver')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT
  );

  -- Add RLS policies
  ALTER TABLE pending_users ENABLE ROW LEVEL SECURITY;

  -- Allow admins to view all pending users
  CREATE POLICY "Admins can view all pending users" ON pending_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'admin'
    )
  );

  -- Allow anyone to insert (for registration)
  CREATE POLICY "Anyone can register" ON pending_users
  FOR INSERT WITH CHECK (true);

  -- Allow admins to update (approve/reject)
  CREATE POLICY "Admins can update pending users" ON pending_users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'admin'
    )
  );