-- =====================================================
-- GRANULAR RBAC INIT
-- Created: 2026-02-06
-- Purpose: Thiết lập lại hệ thống phân quyền chi tiết (Phase 1)
-- =====================================================

-- 1. CLEANUP & PREPARE
-- Xóa các permissions cũ để tái cấu trúc (chỉ xóa data, giữ bảng)
TRUNCATE TABLE available_permissions CASCADE;

-- 2. SEED PERMISSIONS (Danh sách chuẩn)

INSERT INTO available_permissions (id, resource, action, display_name, category) VALUES
-- ➤ Dashboard
('dashboard.view', 'dashboard', 'view', 'Truy cập Dashboard', 'System'),

-- ➤ User Management
('users.view', 'users', 'view', 'Xem danh sách nhân viên (Cơ bản)', 'User Management'),
('users.view_details', 'users', 'view_details', 'Xem chi tiết hồ sơ', 'User Management'),
('users.view_salary', 'users', 'view_salary', '⚠ Xem lương & Hợp đồng', 'User Management'), -- Sensitive
('users.create', 'users', 'create', 'Tạo nhân viên mới', 'User Management'),
('users.edit', 'users', 'edit', 'Sửa thông tin nhân viên', 'User Management'),
('users.delete', 'users', 'delete', 'Xóa/Khóa nhân viên', 'User Management'),

-- ➤ Attendance
('attendance.view', 'attendance', 'view', 'Xem dữ liệu chấm công', 'Attendance'),
('attendance.edit', 'attendance', 'edit', '⚠ Sửa dữ liệu chấm công', 'Attendance'), -- Sensitive
('attendance.export', 'attendance', 'export', 'Xuất báo cáo chấm công', 'Attendance'),

-- ➤ Leave & Approvals
('leaves.view', 'leaves', 'view', 'Xem lịch nghỉ phép', 'Leave Management'),
('leaves.create_for_others', 'leaves', 'create_for_others', 'Tạo đơn nghỉ hộ', 'Leave Management'),
('approvals.view', 'approvals', 'view', 'Xem danh sách yêu cầu cần duyệt', 'Approvals'),
('approvals.approve', 'approvals', 'approve', 'Duyệt/Từ chối yêu cầu', 'Approvals'),

-- ➤ Reports
('reports.view', 'reports', 'view', 'Xem báo cáo thống kê', 'Reports'),
('reports.export', 'reports', 'export', 'Xuất báo cáo tổng hợp', 'Reports'),

-- ➤ System & Settings
('settings.view', 'settings', 'view', 'Xem cấu hình hệ thống', 'System'),
('settings.manage', 'settings', 'manage', 'Chỉnh sửa cấu hình', 'System'),
('roles.view', 'roles', 'view', 'Xem danh sách vai trò', 'System'),
('roles.manage', 'roles', 'manage', '⚠ Quản lý phân quyền', 'System');


-- 3. UPDATE ROLES (Cấp quyền chuẩn)

-- 🛡️ ADMIN: Full quyền
UPDATE roles 
SET permissions = ARRAY['*']
WHERE name = 'admin';

-- 🎯 MANAGER (Trưởng nhóm)
-- Quyền: Xem dashboard, xem nhân viên, duyệt đơn, xem báo cáo, xem công (không sửa)
UPDATE roles
SET permissions = ARRAY[
    'dashboard.view',
    'users.view',
    'users.view_details',
    'approvals.view',
    'approvals.approve',
    'leaves.view',
    'attendance.view',
    'reports.view'
]
WHERE name = 'manager';

-- 👥 HR (Nhân sự)
-- Quyền: Full users (trừ lương?), Full leaves, Sửa công, Reports
UPDATE roles
SET permissions = ARRAY[
    'dashboard.view',
    'users.view',
    'users.view_details',
    'users.create',
    'users.edit',
    'leaves.view',
    'leaves.create_for_others',
    'approvals.view',
    'approvals.approve',
    'attendance.view',
    'attendance.edit', -- HR được sửa công
    'attendance.export',
    'reports.view',
    'reports.export'
]
WHERE name = 'hr';

-- 💰 ACCOUNTANT (Kế toán)
-- Quyền: Xem lương, Xuất báo cáo, Xem công (không sửa)
UPDATE roles
SET permissions = ARRAY[
    'dashboard.view',
    'users.view',
    'users.view_details',
    'users.view_salary', -- Kế toán cần xem lương
    'attendance.view',
    'attendance.export',
    'reports.view',
    'reports.export',
    'leaves.view'
]
WHERE name = 'accountant';

-- 👤 MEMBER: Không có quyền admin
UPDATE roles
SET permissions = ARRAY[]::text[]
WHERE name = 'member';
