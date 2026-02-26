-- Thêm các quyền quản lý Notifications, Audit Logs, Email Templates vào bảng available_permissions

INSERT INTO public.available_permissions (id, resource, action, display_name, category)
VALUES
    ('notif_1', 'notifications', 'view', 'Xem danh sách thông báo', 'notifications'),
    ('notif_2', 'notifications', 'send', 'Gửi thông báo & Email', 'notifications'),
    
    ('audit_1', 'audit_logs', 'view', 'Xem nhật ký hệ thống', 'audit_logs'),
    ('audit_2', 'audit_logs', 'export', 'Xuất nhật ký hệ thống', 'audit_logs'),
    
    ('email_1', 'email_templates', 'view', 'Xem mẫu email', 'email_templates'),
    ('email_2', 'email_templates', 'edit', 'Tạo/Sửa mẫu email', 'email_templates')
ON CONFLICT (id) DO NOTHING;
