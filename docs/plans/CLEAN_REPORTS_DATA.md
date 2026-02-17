# 🗑️ Hướng dẫn xóa data Reports

**Ngày**: 2026-02-07

---

## 🎯 Mục đích:
Xóa toàn bộ data reports trong database để test lại với data mới.

---

## 📝 Cách 1: Qua Supabase Dashboard (KHUYẾN NGHỊ)

### Bước 1: Truy cập Supabase Dashboard
1. Vào https://supabase.com/dashboard
2. Chọn project của bạn
3. Click **SQL Editor** ở menu bên trái

### Bước 2: Chạy SQL Script
Copy và paste đoạn SQL sau vào editor:

```sql
-- Delete all report views first (foreign key constraint)
DELETE FROM report_views;

-- Delete all work reports
DELETE FROM work_reports;

-- Verify deletion
SELECT COUNT(*) as total_reports FROM work_reports;
SELECT COUNT(*) as total_views FROM report_views;
```

### Bước 3: Execute
1. Click nút **RUN** (hoặc Ctrl+Enter)
2. Kiểm tra kết quả:
   - `total_reports: 0` ✅
   - `total_views: 0` ✅

---

## 📝 Cách 2: Qua Table Editor (Đơn giản hơn)

### Bước 1: Xóa Report Views
1. Vào **Table Editor** → Chọn table `report_views`
2. Click **Delete all rows** (icon thùng rác)
3. Confirm deletion

### Bước 2: Xóa Work Reports
1. Vào **Table Editor** → Chọn table `work_reports`
2. Click **Delete all rows**
3. Confirm deletion

---

## ✅ Xác nhận đã xóa thành công

Chạy query sau để kiểm tra:
```sql
SELECT COUNT(*) FROM work_reports;
-- Kết quả phải là: 0
```

---

## 🔧 Đã sửa thêm:

### Vấn đề: Thời gian giống nhau ở tất cả reports

**Nguyên nhân**: Hiển thị `report_date` (chỉ có ngày) thay vì `created_at` (có cả giờ)

**Giải pháp**: Đổi sang hiển thị `created_at`

```typescript
// TRƯỚC (SAI):
{format(new Date(report.report_date), 'HH:mm - dd/MM/yyyy')}

// SAU (ĐÚNG):
{format(new Date(report.created_at), 'HH:mm - dd/MM/yyyy')}
```

**Kết quả**: Mỗi report sẽ hiển thị đúng thời gian tạo! ✅

---

## 🎯 Test lại sau khi xóa:

1. ✅ Xóa hết data reports
2. ✅ Refresh trang Reports (F5)
3. ✅ Tạo report mới (Report 1) → Chờ 1 phút
4. ✅ Tạo report mới (Report 2) → Chờ 1 phút
5. ✅ Tạo report mới (Report 3)
6. ✅ Kiểm tra:
   - Report 3 có lên trên cùng không? ✅
   - Mỗi report có thời gian khác nhau không? ✅
   - Format: `HH:mm - dd/MM/yyyy` đúng không? ✅

---

## 📍 File SQL Script:
`scripts/clean-reports-data.sql`

---

**Created by**: Tiger 🐯  
**Date**: 2026-02-07
