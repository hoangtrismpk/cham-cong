-- =====================================================
-- FIX ADMIN PERMISSIONS & RLS (Final)
-- Replaces brittle 'role' text check with robust 'role_id' relation
-- =====================================================

-- 1. HELPER: is_admin()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user maps to a role named 'admin'
  RETURN EXISTS (
    SELECT 1 FROM profiles p
    JOIN roles r ON p.role_id = r.id
    WHERE p.id = auth.uid() AND r.name = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. BACKFILL role_id (Critical for existing admins)
DO $$
DECLARE
  admin_role_id UUID;
  member_role_id UUID;
BEGIN
  -- Get Role IDs
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
  SELECT id INTO member_role_id FROM roles WHERE name = 'member';
  
  -- Backfill based on legacy 'role' column if it exists and role_id is NULL
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    UPDATE profiles 
    SET role_id = admin_role_id
    WHERE role = 'admin' AND role_id IS NULL;
    
    UPDATE profiles 
    SET role_id = member_role_id
    WHERE role != 'admin' AND role_id IS NULL;
  END IF;
  
  -- Emergency: If current user is running this and has no role_id, make them admin (Dev convenience)
  -- (Optional, safer to skip in prod, but helpful for single-user dev setup)
  -- UPDATE profiles SET role_id = admin_role_id WHERE id = auth.uid() AND role_id IS NULL;
END $$;

-- 3. PROFILES RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- View
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Update
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (is_admin());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Insert
CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Delete
CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  USING (is_admin());

-- 4. UPDATE SYSTEM_SETTINGS & ROLES POLICIES TO USE is_admin()
-- System Settings
DROP POLICY IF EXISTS "Admin can modify settings" ON system_settings;
DROP POLICY IF EXISTS "Admin can insert settings" ON system_settings;
DROP POLICY IF EXISTS "Admin can delete settings" ON system_settings;

CREATE POLICY "Admin can modify settings" ON system_settings FOR UPDATE USING (is_admin());
CREATE POLICY "Admin can insert settings" ON system_settings FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin can delete settings" ON system_settings FOR DELETE USING (is_admin());

-- Roles
DROP POLICY IF EXISTS "Admin can modify roles" ON roles;
DROP POLICY IF EXISTS "Admin can insert roles" ON roles;
DROP POLICY IF EXISTS "Admin can delete roles" ON roles;

CREATE POLICY "Admin can modify roles" ON roles FOR UPDATE USING (is_admin());
CREATE POLICY "Admin can insert roles" ON roles FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin can delete roles" ON roles FOR DELETE USING (is_admin());
