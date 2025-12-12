-- Create function to approve pending users
CREATE OR REPLACE FUNCTION approve_pending_user(pending_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_user_record RECORD;
  new_user_id UUID;
  result JSON;
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
    crypt(pending_user_record.password_hash, gen_salt('bf')),
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