# 📝 CHANGELOG - WordPress Integration

## [1.0.0] - 2026-02-07

### ✨ Added
- **WordPress Integration Settings** (`app/admin/settings/integrations/page.tsx`)
  - Admin UI để cấu hình WordPress connection
  - Test connection functionality
  - Status indicators (success/failed/pending)
  - Security warnings và help section

- **WordPress Upload API** (5 endpoints)
  - `GET /api/admin/wordpress/config` - Lấy cấu hình
  - `POST /api/admin/wordpress/config` - Lưu cấu hình
  - `DELETE /api/admin/wordpress/config` - Xóa cấu hình
  - `POST /api/admin/wordpress/test` - Test kết nối
  - `POST /api/wordpress/upload` - Upload file

- **MediaPicker Component** (`components/wordpress/media-picker.tsx`)
  - Reusable component cho file upload
  - Progress bar
  - File validation (type & size)
  - Error handling

- **WordPress Upload Hook** (`hooks/use-wordpress-upload.ts`)
  - Custom hook để upload file
  - Progress tracking
  - Error handling

### 🔄 Changed
- **Report Form** (`components/reports/report-form.tsx`)
  - ❌ Removed: Local file upload với blob URLs
  - ✅ Added: WordPress Media Library upload
  - ✅ Added: Link trực tiếp đến file trên WordPress

- **Leave Request Form** (`components/leaves/leave-request-form.tsx`)
  - ❌ Removed: Manual URL input
  - ✅ Added: MediaPicker component
  - ✅ Added: Image preview sau upload

- **User Settings** (`app/settings/settings-client.tsx`)
  - ❌ Removed: `uploadImageToHost` function
  - ✅ Added: WordPress upload cho avatar
  - ✅ Added: File validation (type & size max 5MB)
  - ✅ Added: Better error messages

### 🗄️ Database
- **New Table**: `wordpress_config`
  - Stores WordPress connection settings
  - Fields: site_url, username, app_password, is_active, test_status
  - Migration: `migrations/20260207_wordpress_config.sql`

### 📚 Documentation
- `docs/WORDPRESS_INTEGRATION.md` - Full integration guide
- `QUICK_START_WORDPRESS.md` - Quick setup guide
- `.agent/tasks/wordpress_integration_plan.md` - Implementation plan
- `.agent/tasks/wordpress_integration_summary.md` - Summary report

### 🔒 Security
- Admin-only access cho WordPress configuration
- Authentication check cho mọi upload
- File size validation (max 10MB cho reports, 5MB cho avatars)
- File type validation
- Error handling cho missing configuration

### 📊 Statistics
- **Files Created**: 10
- **Files Modified**: 4
- **Total Lines**: ~1,500 lines
- **API Endpoints**: 5
- **Components**: 1
- **Hooks**: 1

---

## 🎯 Breaking Changes
**NONE** - Tất cả thay đổi đều backward compatible.

## 🐛 Known Issues
**NONE** - Không có lỗi được phát hiện.

## 📝 Notes
- Application Password trong database chưa được mã hóa (TODO: implement encryption)
- Chỉ hỗ trợ single file upload (TODO: batch upload)
- Chưa có Media Gallery browser (TODO: browse uploaded files)

---

**Developed by**: Tiger 🐯  
**Date**: 2026-02-07  
**Version**: 1.0.0
