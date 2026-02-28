-- =====================================================
-- ADMIN SYSTEM: Settings, Roles & Permissions
-- Created: 2026-02-05
-- =====================================================

-- 1. SYSTEM SETTINGS TABLE
-- Lưu trữ tất cả cấu hình hệ thống theo dạng key-value
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_settings_subcategory ON system_settings(subcategory);

-- 2. ROLES TABLE
-- Quản lý các vai trò trong hệ thống
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT false,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. AVAILABLE PERMISSIONS (Catalog)
-- Danh mục tất cả quyền có thể gán
CREATE TABLE IF NOT EXISTS available_permissions (
  id TEXT PRIMARY KEY,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL,
  UNIQUE(resource, action)
);

-- 4. UPDATE PROFILES TABLE
-- Thêm cột role_id để liên kết với bảng roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role_id UUID REFERENCES roles(id);
  END IF;
END $$;

-- =====================================================
-- SEED DATA: System Settings
-- =====================================================
INSERT INTO system_settings (key, value, category, subcategory, description) VALUES
  -- GENERAL: Company Info
  ('company_name', '"FHB Vietnam"', 'general', 'company_info', 'Tên công ty'),
  ('company_website', '""', 'general', 'company_info', 'Website công ty'),
  ('company_address', '""', 'general', 'company_info', 'Địa chỉ văn phòng'),
  ('company_logo_url', '""', 'general', 'branding', 'URL logo công ty'),
  
  -- GENERAL: Regional
  ('timezone', '"Asia/Ho_Chi_Minh"', 'general', 'regional', 'Múi giờ'),
  ('date_format', '"DD/MM/YYYY"', 'general', 'regional', 'Định dạng ngày'),
  
  -- GENERAL: Working Hours
  ('work_start_time', '"08:00"', 'general', 'working_hours', 'Giờ bắt đầu làm việc'),
  ('work_end_time', '"17:30"', 'general', 'working_hours', 'Giờ kết thúc làm việc'),
  ('lunch_start_time', '"12:00"', 'general', 'working_hours', 'Giờ bắt đầu nghỉ trưa'),
  ('lunch_end_time', '"13:00"', 'general', 'working_hours', 'Giờ kết thúc nghỉ trưa'),
  
  -- GENERAL: Location
  ('office_latitude', '"10.762622"', 'general', 'location', 'Vĩ độ văn phòng'),
  ('office_longitude', '"106.660172"', 'general', 'location', 'Kinh độ văn phòng'),
  ('max_distance_meters', '100', 'general', 'location', 'Khoảng cách tối đa cho phép (mét)'),
  
  -- GENERAL: Wifi & Rules
  ('company_wifi_ip', '""', 'general', 'wifi', 'Địa chỉ IP Wifi công ty'),
  ('require_gps_and_wifi', 'false', 'general', 'validation', 'Bắt buộc cả GPS và Wifi khi chấm công'),
  
  -- SECURITY: 2FA
  ('2fa_enabled', 'false', 'security', '2fa', 'Bật xác thực 2 yếu tố (MFA) cho Admin'),
  
  -- SECURITY: reCAPTCHA
  ('recaptcha_enabled', 'false', 'security', 'recaptcha', 'Bật reCAPTCHA v3 cho trang đăng nhập'),
  ('recaptcha_site_key', '""', 'security', 'recaptcha', 'reCAPTCHA Site Key'),
  ('recaptcha_secret_key', '""', 'security', 'recaptcha', 'reCAPTCHA Secret Key'),
  
  -- SECURITY: Advanced
  ('ip_whitelist', '[]', 'security', 'advanced', 'Danh sách IP được phép truy cập Admin'),
  ('account_lockout_enabled', 'true', 'security', 'advanced', 'Khóa tài khoản sau nhiều lần đăng nhập sai')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- SEED DATA: Available Permissions
-- =====================================================
INSERT INTO available_permissions (id, resource, action, display_name, category) VALUES
  -- System
  ('settings.view', 'settings', 'view', 'Xem cấu hình hệ thống', 'System'),
  ('settings.edit', 'settings', 'edit', 'Sửa cấu hình hệ thống', 'System'),
  ('roles.view', 'roles', 'view', 'Xem danh sách quyền', 'System'),
  ('roles.manage', 'roles', 'manage', 'Quản lý phân quyền', 'System'),
  
  -- Users
  ('users.view', 'users', 'view', 'Xem danh sách nhân viên', 'Users'),
  ('users.create', 'users', 'create', 'Thêm nhân viên', 'Users'),
  ('users.edit', 'users', 'edit', 'Sửa thông tin nhân viên', 'Users'),
  ('users.delete', 'users', 'delete', 'Xóa nhân viên', 'Users'),
  
  -- Reports
  ('reports.view', 'reports', 'view', 'Xem báo cáo', 'Reports'),
  ('reports.export', 'reports', 'export', 'Xuất báo cáo', 'Reports'),
  
  -- Attendance
  ('attendance.view', 'attendance', 'view', 'Xem lịch sử chấm công', 'Attendance'),
  ('attendance.edit', 'attendance', 'edit', 'Sửa lịch sử chấm công', 'Attendance'),
  ('attendance.approve', 'attendance', 'approve', 'Duyệt chấm công', 'Attendance'),
  
  -- Schedules
  ('schedules.view', 'schedules', 'view', 'Xem lịch làm việc', 'Schedules'),
  ('schedules.create', 'schedules', 'create', 'Tạo lịch làm việc', 'Schedules'),
  ('schedules.edit', 'schedules', 'edit', 'Sửa lịch làm việc', 'Schedules'),
  ('schedules.delete', 'schedules', 'delete', 'Xóa lịch làm việc', 'Schedules')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SEED DATA: Default Roles
-- =====================================================
INSERT INTO roles (name, display_name, description, is_system_role, permissions) VALUES
  ('admin', 'Quản trị viên', 'Có toàn quyền truy cập và quản lý hệ thống', true, ARRAY['*']),
  ('accountant', 'Kế toán', 'Chỉ được xem và xuất báo cáo chấm công', true, ARRAY['reports.view', 'reports.export', 'attendance.view']),
  ('member', 'Thành viên', 'Chỉ sử dụng ứng dụng phía người dùng, không truy cập được Admin', true, ARRAY[]::TEXT[])
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- RLS POLICIES: System Settings
-- =====================================================
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access settings" ON system_settings;
CREATE POLICY "Admin full access settings"
  ON system_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() 
      AND ('*' = ANY(r.permissions) OR 'settings.edit' = ANY(r.permissions))
    )
  );

DROP POLICY IF EXISTS "Users read settings" ON system_settings;
CREATE POLICY "Users read settings"
  ON system_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- =====================================================
-- RLS POLICIES: Roles
-- =====================================================
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage roles" ON roles;
CREATE POLICY "Admin manage roles"
  ON roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() 
      AND ('*' = ANY(r.permissions) OR 'roles.manage' = ANY(r.permissions))
    )
  );

DROP POLICY IF EXISTS "Users read roles" ON roles;
CREATE POLICY "Users read roles"
  ON roles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- =====================================================
-- RLS POLICIES: Available Permissions
-- =====================================================
ALTER TABLE available_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All read permissions" ON available_permissions;
CREATE POLICY "All read permissions"
  ON available_permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- =====================================================
-- HELPER FUNCTION: Check Permission
-- =====================================================
CREATE OR REPLACE FUNCTION check_user_permission(user_id UUID, required_permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_permissions TEXT[];
  resource TEXT;
BEGIN
  -- Get user's permissions from role
  SELECT r.permissions INTO user_permissions
  FROM profiles p
  JOIN roles r ON p.role_id = r.id
  WHERE p.id = user_id;
  
  -- Check wildcard
  IF '*' = ANY(user_permissions) THEN
    RETURN true;
  END IF;
  
  -- Check exact match
  IF required_permission = ANY(user_permissions) THEN
    RETURN true;
  END IF;
  
  -- Check resource wildcard (e.g., "users.*")
  resource := split_part(required_permission, '.', 1);
  IF (resource || '.*') = ANY(user_permissions) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
