-- =====================================================
-- ADMIN SYSTEM: Reports Settings Option A
-- =====================================================

INSERT INTO system_settings (key, value, category, subcategory, description) VALUES
  ('reports_default_recipients', '[]', 'reports', 'recipients', 'Danh sách người nhận báo cáo mặc định'),
  ('reports_require_direct_manager', 'true', 'reports', 'recipients', 'Tự động thêm quản lý trực tiếp vào danh sách nhận báo cáo')
ON CONFLICT (key) DO NOTHING;
