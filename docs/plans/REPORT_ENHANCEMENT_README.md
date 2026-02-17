# Report Enhancement & Notification System

## ⚠️ QUAN TRỌNG: CẦN RESTART SERVER

Sau khi cập nhật code, nếu gặp lỗi `Module [project]/components/dashboard-layout.tsx ...` hoặc các lỗi module lạ, bạn cần thực hiện:

1. Dừng server hiện tại (Ctrl+C).
2. Xóa thư mục `.next` (để clear cache).
3. Chạy lại `npm run dev`.

Lý do: Next.js cache có thể bị xung đột khi thay đổi cấu trúc file hoặc Server Actions liên tục.

---


## 🎯 Tổng quan

Hệ thống đã được nâng cấp với các tính năng mới:

1. ✅ **Hiển thị kế hoạch trong báo cáo** (Ngày mai, Tuần tới, Tháng tới)
2. ✅ **Hệ thống thông báo 2 chiều** (Admin ⇄ User)
3. ✅ **Các actions admin hoàn chỉnh** (Góp ý, Yêu cầu s  ửa, Phê duyệt)
4. ✅ **Cho phép user edit báo cáo** khi nhận yêu cầu chỉnh sửa

---

## 📦 Files đã tạo/sửa

### Database Migration
- `supabase/migrations/20260209_enhance_reports_and_notifications.sql`
  - Thêm 3 cột: `next_day_plan`, `next_week_plan`, `next_month_plan` vào bảng `work_reports`
  - Tạo bảng `notifications` với RLS policies

### Backend Actions
- `app/actions/notifications.ts` (Mới)
  - `createNotification()` - Tạo thông báo
  - `getNotifications()` - Lấy danh sách thông báo
  - `markAsRead()` - Đánh dấu đã đọc
  - `markAllAsRead()` - Đánh dấu tất cả đã đọc

- `app/actions/work-reports-admin.ts` (Mới)
  - `approveReport()` - Phê duyệt + gửi thông báo
  - `requestReportChanges()` - Yêu cầu sửa + gửi thông báo
  - `addReportFeedback()` - Góp ý + gửi thông báo
  - `notifyReportUpdated()` - Thông báo cho admin khi user cập nhật

- `app/actions/work-reports.ts` (Updated)
  - Thêm 3 trường kếhoạch vào `WorkReport` interface

### Frontend Components
- `components/notifications/notification-bell.tsx` (Mới)
  - Component notification bell với badge đếm số lượng
  - Dropdown hiển thị danh sách thông báo
  - Click vào thông báo để navigate đến báo cáo tương ứng

- `components/reports/report-detail-modal.tsx` (Updated)
  - Hiển thị 3 phần kế hoạch (xanh/tím/cam cho ngày/tuần/tháng)
  - Kết nối 3 nút action với các functions backend
  - Auto refresh sau khi thực hiện action

---

## 🔧 Cách sử dụng

### 1. Chạy Migration

```bash
# Từ Supabase SQL Editor hoặc CLI
psql -h db.xxx.supabase.co -U postgres -d postgres < supabase/migrations/20260209_enhance_reports_and_notifications.sql
```

Hoặc copy nội dung file migration vào Supabase SQL Editor và chạy.

### 2. Thêm Notification Bell vào Sidebar

Mở file sidebar cần thêm thông báo (ví dụ: `components/reports/reports-sidebar.tsx`):

```tsx
import NotificationBell from '@/components/notifications/notification-bell'

// Thêm vào header của sidebar
<div className="flex items-center gap-4">
  <NotificationBell />
  {/* ... các components khác */}
</div>
```

### 3. Cập nhật Report Form (Nếu cần)

Thêm 3 trường kế hoạch vào form submit báo cáo:
- `next_day_plan` - Kế hoạch ngày mai
- `next_week_plan` - Kế hoạch tuần tới
- `next_month_plan` - Kế hoạch tháng tới

---

## 🎬 Luồng hoạt động

### Scenario 1: Admin yêu cầu chỉnh sửa
1. Admin mở báo cáo → Click **"Yêu cầu sửa"**
2. Nhập nội dung yêu cầu → Gửi
3. ✅ Status báo cáo = `changes_requested`
4. ✅ User nhận thông báo
5. User click vào thông báo → Tự động mở form edit report
6. User sửa xong → Submit lại
7. ✅ Admin nhận thông báo "Báo cáo đã được cập nhật"

### Scenario 2: Admin phê duyệt
1. Admin mở báo cáo → Click **"Phê duyệt"**
2. (Tùy chọn) Thêm ghi chú
3. ✅ Status báo cáo = `approved`
4. ✅ User nhận thông báo "Báo cáo đã được phê duyệt"

### Scenario 3: Admin góp ý
1. Admin mở báo cáo → Click **"Góp ý"**
2. Nhập nội dung góp ý
3. ✅ Ghi chú được thêm vào báo cáo
4. ✅ User nhận thông báo "Góp ý mới cho báo cáo"

---

## 🎨 UI Design

- **Kế hoạch ngày mai**: Màu xanh dương (Blue)
- **Kế hoạch tuần tới**: Màu tím (Purple)
- **Kế hoạch tháng tới**: Màu cam (Orange)
- **Notification Bell**: Badge đỏ với số lượng chưa đọc
- **Toast Messages**: Hiển thị kết quả sau mỗi action

---

## 🐛 Troubleshooting

### Database Migration Failed
- Kiểm tra xem bảng `work_reports` đã tồn tại chưa
- Kiểm tra permissions của user Postgres

### Notifications không hiển thị
- Kiểm tra RLS policies đã được tạo đúng chưa
- Kiểm tra user đã login chưa

### "Yêu cầu sửa" không navigate đến form
- Kiểm tra route `/reports` có support query params `?edit=true&report_id=xxx` chưa
- Cần implement logic load report data khi có query params

---

## 📝 TODO

- [ ] Thêm email notification (tích hợp Resend/SendGrid)
- [ ] Thêm push notification (Web Push API)
- [ ] Thêm filter/search trong notification dropdown
- [ ] Thêm "Delete all read" button

---

*Phát triển bởi Tiger 🐯 - Antigravity IDE*
