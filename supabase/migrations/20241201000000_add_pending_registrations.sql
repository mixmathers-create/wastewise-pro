-- Create pending_registrations table for approval workflow
CREATE TABLE pending_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  requested_role TEXT NOT NULL CHECK (requested_role IN ('admin', 'mechanic', 'collector', 'hr')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE pending_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all pending registrations" ON pending_registrations 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid()::text 
    AND user_type = 'admin'
  )
);

CREATE POLICY "Admins can update pending registrations" ON pending_registrations 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid()::text 
    AND user_type = 'admin'
  )
);

-- Allow public insert for registration requests
CREATE POLICY "Anyone can create registration requests" ON pending_registrations 
FOR INSERT WITH CHECK (true);

-- Create function to handle registration approval
CREATE OR REPLACE FUNCTION approve_registration(registration_id UUID, assigned_user_type TEXT)
RETURNS JSON AS $$
DECLARE
  reg_record pending_registrations%ROWTYPE;
  new_user_id UUID;
BEGIN
  -- Get the pending registration
  SELECT * INTO reg_record FROM pending_registrations WHERE id = registration_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Registration not found or already processed');
  END IF;
  
  -- Create the auth user
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
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    reg_record.email,
    reg_record.password_hash,
    NOW(),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ) RETURNING id INTO new_user_id;
  
  -- Create profile
  INSERT INTO profiles (user_id, full_name, email, role, user_type)
  VALUES (new_user_id::text, reg_record.full_name, reg_record.email, 'user', assigned_user_type);
  
  -- Create user role
  INSERT INTO user_roles (user_id, role)
  VALUES (new_user_id::text, 'user');
  
  -- Update registration status
  UPDATE pending_registrations 
  SET status = 'approved', 
      approved_by = auth.uid(), 
      approved_at = NOW(),
      updated_at = NOW()
  WHERE id = registration_id;
  
  RETURN json_build_object('success', true, 'user_id', new_user_id);
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;