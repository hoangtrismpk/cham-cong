# WordPress Integration Setup Guide

## 📋 Tổng quan

Tính năng tích hợp WordPress cho phép upload file lên WordPress Media Library từ ứng dụng Chấm Công.

---

## 🚀 Hướng dẫn Cài đặt

### Bước 1: Apply Migration

Chạy lệnh sau để tạo bảng `wordpress_config` trong database:

```bash
node scripts/apply-migration-pg.js 20260207_wordpress_config.sql
```

**Lưu ý**: Bạn cần cập nhật Database Password trong file `scripts/apply-migration-pg.js` dòng 31 trước khi chạy.

### Bước 2: Cấu hình WordPress

1. Đăng nhập vào Admin Panel: `http://localhost:3000/admin`
2. Vào **Settings > Integrations**
3. Điền thông tin:
   - **WordPress Site URL**: `https://yoursite.com` (không có dấu `/` cuối)
   - **Username**: Tên đăng nhập WordPress của bạn
   - **Application Password**: Tạo mới tại WordPress Admin > Users > Profile

4. Click **"Kiểm tra kết nối"** để test
5. Nếu thành công, click **"Lưu cấu hình"**

---

## 🔧 Tạo Application Password trong WordPress

1. Đăng nhập vào WordPress Admin
2. Vào **Users → Your Profile**
3. Cuộn xuống phần **"Application Passwords"**
4. Nhập tên ứng dụng (ví dụ: "Cham Cong App")
5. Click **"Add New Application Password"**
6. Copy password được tạo ra (dạng: `xxxx xxxx xxxx xxxx xxxx xxxx`)
7. Paste vào form cấu hình trong Admin Panel

**Lưu ý**: Application Password chỉ hiển thị 1 lần. Hãy lưu lại ngay!

---

## 📝 Sử dụng

### Trong Report Form

File upload sẽ tự động sử dụng WordPress Media Library:

```tsx
import { MediaPicker } from '@/components/wordpress/media-picker'

<MediaPicker
  onUploadSuccess={(url) => {
    console.log('File uploaded:', url)
  }}
  accept="image/*,application/pdf"
  maxSize={10}
/>
```

### Trong Leave Request Form

Tương tự, thay thế input URL thủ công bằng MediaPicker.

---

## 🔒 Bảo mật

- Application Password được lưu trong database (nên mã hóa trong production)
- Chỉ Admin mới có quyền cấu hình WordPress
- Người dùng thường chỉ có quyền upload file

---

## 🐛 Troubleshooting

### Lỗi "WordPress chưa được cấu hình"

**Nguyên nhân**: Chưa có cấu hình WordPress trong database.

**Giải pháp**: Liên hệ Admin để cấu hình tại Settings > Integrations.

### Lỗi "Kết nối thất bại"

**Nguyên nhân**: 
- URL sai
- Username/Password sai
- WordPress không bật REST API
- CORS issue

**Giải pháp**:
1. Kiểm tra lại URL (phải có `https://`)
2. Tạo lại Application Password
3. Đảm bảo WordPress REST API hoạt động: `https://yoursite.com/wp-json/wp/v2`

### Lỗi "Upload thất bại"

**Nguyên nhân**:
- File quá lớn (>10MB)
- Định dạng file không được hỗ trợ
- WordPress không cho phép upload loại file này

**Giải pháp**:
1. Giảm kích thước file
2. Kiểm tra định dạng file được phép trong WordPress

---

## 📚 API Endpoints

### Admin APIs (Chỉ Admin)

- `GET /api/admin/wordpress/config` - Lấy cấu hình hiện tại
- `POST /api/admin/wordpress/config` - Lưu cấu hình mới
- `DELETE /api/admin/wordpress/config` - Xóa cấu hình
- `POST /api/admin/wordpress/test` - Test kết nối

### User APIs

- `POST /api/wordpress/upload` - Upload file lên WordPress

---

## 🎯 Roadmap

- [ ] Mã hóa Application Password trong database
- [ ] Media Gallery browser (chọn file đã upload)
- [ ] Batch upload (nhiều file cùng lúc)
- [ ] Resize ảnh trước khi upload
- [ ] Support cho video upload

---

**Created**: 2026-02-07  
**Version**: 1.0.0
