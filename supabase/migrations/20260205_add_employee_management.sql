-- =====================================================
-- EMPLOYEE MANAGEMENT: Add status and phone columns to profiles
-- Created: 2026-02-05
-- =====================================================

-- Add status column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
END $$;

-- Add phone column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone TEXT;
  END IF;
END $$;

-- Create index for faster search
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON profiles(full_name);

-- Update RLS policy to allow admin to view all profiles
DROP POLICY IF EXISTS "Admin view all profiles" ON profiles;
CREATE POLICY "Admin view all profiles"
  ON profiles FOR SELECT
  USING (
    -- User can view their own profile
    auth.uid() = id
    OR
    -- Admin can view all profiles
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() 
      AND ('*' = ANY(r.permissions) OR 'users.view' = ANY(r.permissions))
    )
  );

-- Allow admin to update any profile
DROP POLICY IF EXISTS "Admin update profiles" ON profiles;
CREATE POLICY "Admin update profiles"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = id
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() 
      AND ('*' = ANY(r.permissions) OR 'users.edit' = ANY(r.permissions))
    )
  );

-- Allow admin to insert profiles
DROP POLICY IF EXISTS "Admin insert profiles" ON profiles;
CREATE POLICY "Admin insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() 
      AND ('*' = ANY(r.permissions) OR 'users.create' = ANY(r.permissions))
    )
  );
