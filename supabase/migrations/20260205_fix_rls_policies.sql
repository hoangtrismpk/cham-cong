-- =====================================================
-- FIX RLS POLICIES: Simplify to use 'role' column directly
-- Created: 2026-02-05 14:46
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Admin full access settings" ON system_settings;
DROP POLICY IF EXISTS "Users read settings" ON system_settings;
DROP POLICY IF EXISTS "Admin manage roles" ON roles;
DROP POLICY IF EXISTS "Users read roles" ON roles;

-- =====================================================
-- SYSTEM SETTINGS: New Simplified Policies
-- =====================================================

-- Allow everyone to READ settings (needed for app config)
CREATE POLICY "Anyone can read settings"
  ON system_settings FOR SELECT
  USING (true);

-- Allow admin to UPDATE/INSERT/DELETE settings
CREATE POLICY "Admin can modify settings"
  ON system_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can insert settings"
  ON system_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can delete settings"
  ON system_settings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- ROLES: New Simplified Policies
-- =====================================================

-- Everyone can read roles
CREATE POLICY "Anyone can read roles"
  ON roles FOR SELECT
  USING (true);

-- Only admin can modify roles
CREATE POLICY "Admin can modify roles"
  ON roles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can insert roles"
  ON roles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can delete roles"
  ON roles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
