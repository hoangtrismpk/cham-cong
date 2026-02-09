-- =====================================================
-- ADD MISSING PERMISSIONS
-- Created: 2026-02-06
-- Purpose: Bổ sung các permissions còn thiếu cho Admin features
-- =====================================================

-- Thêm permissions mới vào bảng available_permissions
INSERT INTO available_permissions (id, resource, action, display_name, category) VALUES
  -- Dashboard
  ('dashboard.view', 'dashboard', 'view', 'Truy cập Dashboard Admin', 'System'),
  
  -- Approvals (hiện chưa có)
  ('approvals.view', 'approvals', 'view', 'Xem danh sách yêu cầu', 'Approvals'),
  ('approvals.approve', 'approvals', 'approve', 'Duyệt/Từ chối yêu cầu', 'Approvals'),
  
  -- Leave Requests (chi tiết hơn approvals)
  ('leaves.view', 'leaves', 'view', 'Xem danh sách nghỉ phép', 'Leave Management'),
  ('leaves.approve', 'leaves', 'approve', 'Duyệt nghỉ phép', 'Leave Management'),
  ('leaves.create_for_others', 'leaves', 'create_for_others', 'Tạo đơn nghỉ cho người khác', 'Leave Management'),
  
  -- Notifications  
  ('notifications.manage', 'notifications', 'manage', 'Quản lý thông báo hệ thống', 'System')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- UPDATE DEFAULT ROLES WITH NEW PERMISSIONS
-- =====================================================

-- Update Accountant role: Thêm quyền xem approvals
UPDATE roles
SET permissions = ARRAY['reports.view', 'reports.export', 'attendance.view', 'approvals.view', 'dashboard.view']
WHERE name = 'accountant';

-- Update Admin role (đảm bảo có wildcard)
UPDATE roles
SET permissions = ARRAY['*']
WHERE name = 'admin' AND NOT ('*' = ANY(permissions));

-- Đảm bảo Member không có quyền admin
UPDATE roles
SET permissions = ARRAY[]::TEXT[]
WHERE name = 'member';

-- =====================================================
-- CREATE NEW ROLE: Manager
-- =====================================================
INSERT INTO roles (name, display_name, description, is_system_role, permissions) VALUES
  ('manager', 'Quản lý', 'Có quyền duyệt yêu cầu và xem báo cáo', true, 
   ARRAY[
     'dashboard.view',
     'approvals.view', 
     'approvals.approve',
     'leaves.view',
     'leaves.approve', 
     'users.view',
     'reports.view',
     'reports.export',
     'attendance.view'
   ])
ON CONFLICT (name) DO UPDATE SET
  permissions = EXCLUDED.permissions,
  description = EXCLUDED.description;

-- =====================================================
-- CREATE NEW ROLE: HR
-- =====================================================
INSERT INTO roles (name, display_name, description, is_system_role, permissions) VALUES
  ('hr', 'Nhân sự', 'Quản lý nhân viên và chấm công', true, 
   ARRAY[
     'dashboard.view',
     'users.view',
     'users.create', 
     'users.edit',
     'leaves.view',
     'leaves.approve',
     'leaves.create_for_others',
     'attendance.view',
     'attendance.edit'
   ])
ON CONFLICT (name) DO UPDATE SET
  permissions = EXCLUDED.permissions,
  description = EXCLUDED.description;
