-- Minimal User Approval System Setup
-- Run this entire file in your Supabase SQL editor

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
DROP POLICY IF EXISTS "All authenticated users can view pending users" ON pending_users;
DROP POLICY IF EXISTS "All authenticated users can update pending users" ON pending_users;

-- 4. Create RLS policies
CREATE POLICY "Allow unauthenticated registration" ON pending_users
FOR INSERT WITH CHECK (true);

CREATE POLICY "All authenticated users can view pending users" ON pending_users
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can update pending users" ON pending_users
FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 5. Create user approval function (simplified - just updates status)
CREATE OR REPLACE FUNCTION approve_pending_user(pending_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_user_record RECORD;
BEGIN
  -- Get pending user details
  SELECT * INTO pending_user_record
  FROM pending_users
  WHERE id = pending_user_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Pending user not found');
  END IF;
  
  -- Update pending user status
  UPDATE pending_users
  SET 
    status = 'approved',
    reviewed_at = NOW(),
    reviewed_by = auth.uid()
  WHERE id = pending_user_id;
  
  RETURN json_build_object('success', true, 'email', pending_user_record.email, 'password', pending_user_record.password_hash);
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pending_users_status ON pending_users(status);
CREATE INDEX IF NOT EXISTS idx_pending_users_created_at ON pending_users(created_at);