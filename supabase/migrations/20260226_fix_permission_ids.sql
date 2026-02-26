-- =====================================================
-- FIX PERMISSION IDS: Rename old format to standard resource.action format
-- Created: 2026-02-26
-- Purpose: Rename notif_1/audit_1/email_1 etc to notifications.view / audit_logs.view / email_templates.view
-- =====================================================

-- Step 1: Update available_permissions IDs

-- Notifications
UPDATE available_permissions SET id = 'notifications.view' WHERE id = 'notif_1';
UPDATE available_permissions SET id = 'notifications.send' WHERE id = 'notif_2';

-- Audit Logs
UPDATE available_permissions SET id = 'audit_logs.view' WHERE id = 'audit_1';
UPDATE available_permissions SET id = 'audit_logs.export' WHERE id = 'audit_2';

-- Email Templates
UPDATE available_permissions SET id = 'email_templates.view' WHERE id = 'email_1';
UPDATE available_permissions SET id = 'email_templates.edit' WHERE id = 'email_2';


-- Step 2: Update roles.permissions arrays (replace old IDs with new ones)
-- This updates ANY role that has these old permission IDs

UPDATE roles
SET permissions = array_replace(permissions, 'notif_1', 'notifications.view')
WHERE 'notif_1' = ANY(permissions);

UPDATE roles
SET permissions = array_replace(permissions, 'notif_2', 'notifications.send')
WHERE 'notif_2' = ANY(permissions);

UPDATE roles
SET permissions = array_replace(permissions, 'audit_1', 'audit_logs.view')
WHERE 'audit_1' = ANY(permissions);

UPDATE roles
SET permissions = array_replace(permissions, 'audit_2', 'audit_logs.export')
WHERE 'audit_2' = ANY(permissions);

UPDATE roles
SET permissions = array_replace(permissions, 'email_1', 'email_templates.view')
WHERE 'email_1' = ANY(permissions);

UPDATE roles
SET permissions = array_replace(permissions, 'email_2', 'email_templates.edit')
WHERE 'email_2' = ANY(permissions);


-- Step 3: Also add the my_team.view permission if not exists
INSERT INTO available_permissions (id, resource, action, display_name, category) VALUES
    ('my_team.view', 'my_team', 'view', 'Xem danh sách Đội ngũ', 'User Management')
ON CONFLICT (id) DO NOTHING;

-- Step 4: Also add settings sub-permissions if not exists
INSERT INTO available_permissions (id, resource, action, display_name, category) VALUES
    ('settings_organization.manage', 'settings_organization', 'manage', 'Quản lý Cài đặt Tổ chức', 'settings'),
    ('settings_security.manage', 'settings_security', 'manage', 'Quản lý Bảo mật (2FA, reCAPTCHA)', 'settings'),
    ('settings_notifications.manage', 'settings_notifications', 'manage', 'Quản lý Cài đặt Thông báo', 'settings'),
    ('settings_email.manage', 'settings_email', 'manage', 'Quản lý Cấu hình Email (SMTP)', 'settings'),
    ('settings_feature_toggles.manage', 'settings_feature_toggles', 'manage', 'Bật/tắt Tính năng hệ thống', 'settings'),
    ('settings_integrations.manage', 'settings_integrations', 'manage', 'Quản lý Tích hợp (API, Webhooks)', 'settings')
ON CONFLICT (id) DO NOTHING;

-- Step 5: Add the new attendance scope permissions
INSERT INTO available_permissions (id, resource, action, display_name, category) VALUES
    ('attendance.view_all', 'attendance', 'view_all', 'View All Employees Attendance', 'Attendance'),
    ('attendance.view_team', 'attendance', 'view_team', 'View Team Attendance Only', 'Attendance')
ON CONFLICT (id) DO NOTHING;
