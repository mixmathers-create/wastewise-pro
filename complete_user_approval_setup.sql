-- Complete User Approval System Setup
-- Run this entire file in your Supabase SQL editor

-- No extensions needed for this simplified approach

-- 1. Create pending_users table
CREATE TABLE IF NOT EXISTS pending_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('admin', 'driver', 'helper', 'mechanic')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT
);

-- 2. Enable RLS on pending_users
ALTER TABLE pending_users ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow unauthenticated registration" ON pending_users;
DROP POLICY IF EXISTS "Admins can view all pending users" ON pending_users;
DROP POLICY IF EXISTS "Temp: All authenticated users can view pending users" ON pending_users;
DROP POLICY IF EXISTS "Admins can update pending users" ON pending_users;
DROP POLICY IF EXISTS "Temp: All authenticated users can update pending users" ON pending_users;

-- 4. Create RLS policies
CREATE POLICY "Allow unauthenticated registration" ON pending_users
FOR INSERT WITH CHECK (true);

CREATE POLICY "All authenticated users can view pending users" ON pending_users
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can update pending users" ON pending_users
FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 5. Create receipt_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS receipt_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable RLS on receipt_settings
ALTER TABLE receipt_settings ENABLE ROW LEVEL SECURITY;

-- 7. Create receipt_settings policies
DROP POLICY IF EXISTS "Users can manage their own receipt settings" ON receipt_settings;
CREATE POLICY "Users can manage their own receipt settings" ON receipt_settings
FOR ALL USING (auth.uid() = user_id);

-- 8. Create user approval function
CREATE OR REPLACE FUNCTION approve_pending_user(pending_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_user_record RECORD;
  new_user_id UUID;
BEGIN
  -- Get pending user details
  SELECT * INTO pending_user_record
  FROM pending_users
  WHERE id = pending_user_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Pending user not found');
  END IF;
  
  -- Generate new UUID for the user
  new_user_id := gen_random_uuid();
  
  -- Insert into auth.users (this requires service role privileges)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    pending_user_record.email,
    '$2a$10$' || encode(digest(pending_user_record.password_hash, 'sha256'), 'hex'),
    NOW(),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );
  
  -- Create profile
  INSERT INTO profiles (
    id,
    email,
    full_name,
    user_type,
    role
  ) VALUES (
    new_user_id,
    pending_user_record.email,
    pending_user_record.full_name,
    pending_user_record.user_type,
    pending_user_record.user_type
  );
  
  -- Update pending user status
  UPDATE pending_users
  SET 
    status = 'approved',
    reviewed_at = NOW(),
    reviewed_by = auth.uid()
  WHERE id = pending_user_id;
  
  RETURN json_build_object('success', true, 'user_id', new_user_id);
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 9. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pending_users_status ON pending_users(status);
CREATE INDEX IF NOT EXISTS idx_pending_users_created_at ON pending_users(created_at);
CREATE INDEX IF NOT EXISTS idx_receipt_settings_user_id ON receipt_settings(user_id);

-- 10. Update existing RLS policies for personnel_time_logs (if needed)
DROP POLICY IF EXISTS "Users can view time logs for their team" ON personnel_time_logs;
CREATE POLICY "Users can view time logs for their team" ON personnel_time_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_type IN ('admin', 'driver', 'helper', 'mechanic')
  )
);

DROP POLICY IF EXISTS "Users can insert their own time logs" ON personnel_time_logs;
CREATE POLICY "Users can insert their own time logs" ON personnel_time_logs
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_type IN ('admin', 'driver')
  )
);

DROP POLICY IF EXISTS "Users can update their own time logs" ON personnel_time_logs;
CREATE POLICY "Users can update their own time logs" ON personnel_time_logs
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_type IN ('admin', 'driver')
  )
);