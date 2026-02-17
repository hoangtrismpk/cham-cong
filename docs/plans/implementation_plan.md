# Implementation Plan - Timekeeping App (HRM Pro)

## 1. Vision & Scope
Xây dựng hệ thống chấm công và quản trị nhân sự (HRM) toàn diện dựa trên **Option C**. Hệ thống tập trung vào trải nghiệm người dùng hiện đại, tính chính xác cao trong chấm công và khả năng quản lý linh hoạt cho doanh nghiệp.

**Tech Stack:**
- **Frontend**: Next.js (App Router), Tailwind CSS.
- **Backend/DB**: Supabase (Postgres, Auth, Realtime, Storage).
- **Hosting**: Vercel.
- **Design Base**: Stitch generated HTML (Tailwind).

## 2. Feature Analysis (Mapped from Design)

### 2.1. Authentication & Onboarding
*Design Ref: `login_screen`, `account_registration`*
- [ ] **Login**: Email/Password. Hỗ trợ "Remember me".
- [ ] **Registration**: Đăng ký tài khoản mới (cần Admin duyệt hoặc Email domain whitelist).
- [ ] **Forgot Password**: Quy trình reset password qua email (Supabase Auth).
- [ ] **First-login Wizard**: Yêu cầu nhân viên cập nhật thông tin cá nhân bắt buộc.

### 2.2. Employee Portal (User)
*Design Ref: `user_check-in_dashboard`, `personal_attendance_stats`, `employee_profile_detail`*
- [ ] **Smart Check-in/out**:
    - Tự động nhận diện trạng thái (Check-in hay Check-out).
    - **Validation**: Kiểm tra GPS (Geo-fencing) hoặc IP Wifi.
    - **Visual**: Hiển thị đồng hồ Server Time (Realtime).
- [ ] **Attendance History**: Xem lịch sử chấm công, số phút đi muộn/về sớm.
- [ ] **Profile Management**: Xem/Sửa thông tin cá nhân.
- [ ] **Request Management**: Gửi đơn xin nghỉ phép, giải trình công (UI cần làm thêm hoặc popup).

### 2.3. Admin Portal (Manager)
*Design Ref: `admin_overview_dashboard`, `admin_employee_management`, `admin_detailed_reports`*
- [ ] **Dashboard Overview**:
    - Số nhân viên hiện diện/vắng mặt (Realtime).
    - Biểu đồ xu hướng đi muộn.
- [ ] **Employee Management**:
    - Danh sách nhân viên (Search, Filter).
    - CRUD nhân viên (Tạo, Sửa, Xóa/Khóa).
- [ ] **Reporting**:
    - Xem chi tiết bảng công theo tháng.
    - Xuất dữ liệu ra Excel (.xlsx).
- [ ] **Approval**: Duyệt đơn xin nghỉ/giải trình.

## 3. Database Schema (Supabase draft)

### Tables
1.  **profiles**: `id` (FK auth.users), `full_name`, `avatar_url`, `role` (admin/user), `department`, `position`.
2.  **attendance_logs**: `id`, `user_id`, `check_in_at`, `check_out_at`, `date`, `status` (late/on-time), `ip_address`, `location_data`.
3.  **requests**: `id`, `user_id`, `type` (leave/correction), `status` (pending/approved/rejected), `reason`, `start_date`, `end_date`.
4.  **settings**: `key`, `value` (Lưu cấu hình GPS, IP Whitelist).

## 4. Work Streams (Phases)

### Phase 1: Foundation & Auth (Week 1)
- Setup Next.js + Supabase.
- Implement UI Design to Code (Login, Register).
- Setup Database Schema.

### Phase 2: Core Timekeeping (Week 2)
- Implement User Dashboard.
- Logic Check-in/out (GPS + IP).
- Implement Profile View.

### Phase 3: Admin & Reporting (Week 3)
- Implement Admin Dashboard.
- Employee Management.
- Attendance Reports.

### Phase 4: Refine & Optimization (Week 4)
- Request/Approval Flow.
- Polish UI/UX (Animations, Loading states).
- Deploy & Test.

---
*Created by Tiger Agent*
