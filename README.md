# 🕒 Cham-Cong - Intelligent Attendance System

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-blue?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

**Cham-Cong** là một giải pháp quản lý chấm công hiện đại, được thiết kế để tối ưu hóa việc theo dõi thời gian làm việc, quản lý nghỉ phép và tự động hóa báo cáo cho doanh nghiệp. Hệ thống tích hợp các công nghệ bảo mật tiên tiến và trải nghiệm người dùng mượt mà trên cả máy tính và di động.

---

| **20** Bộ Kỹ năng (Modules) | **18** Agent Chuyên gia | **21** Quy trình (Workflows) | **17** Luật Hệ thống (Rules) |
| :---: | :---: | :---: | :---: |

---

## ✨ Tính năng nổi bật

### 👤 Dành cho Nhân viên
- 📍 **Chấm công Thông minh**: Hỗ trợ chấm công qua tọa độ GPS (bán kính cho phép) hoặc định danh địa chỉ IP Wifi văn phòng.
- 📅 **Quản lý Nghỉ phép**: Gửi yêu cầu nghỉ phép (cả ngày, nửa ngày hoặc theo giờ) kèm minh chứng ảnh. Theo dõi trạng thái duyệt thời gian thực.
- ⏳ **Đăng ký Tăng ca (OT)**: Tính toán tự động số giờ được phép OT dựa trên ranh giới ca làm việc, hiển thị trần OT an toàn, ngăn chặn lặp giờ qua ngày.
- 🔔 **Thông báo Nhắc nhở**: Tự động nhận thông báo (Push Notification) nhắc nhở check-in/check-out trước ca làm việc.
- 📱 **Trải nghiệm PWA**: Cài đặt ứng dụng trực tiếp lên màn hình điện thoại, hoạt động như một App native.

### 🛡️ Dành cho Quản lý & HR
- 📊 **Dashboard Tổng quan**: Theo dõi danh sách nhân viên đi làm, đi muộn, hoặc đang nghỉ phép trong ngày.
- ⚙️ **Cài đặt Linh hoạt**: Cấu hình tọa độ công ty, danh sách IP Wifi văn phòng, và các quy tắc chấm công (giờ vào, giờ ra) ngay trên UI.
- 📁 **Cấu hình Báo cáo**: Tùy chỉnh danh sách người nhận báo cáo mặc định (Global Observers) và bắt buộc có quản lý trực tiếp hay không.
- 🧾 **Duyệt Nghỉ phép & Tăng ca**: Quy trình duyệt nhiều cấp các yêu cầu nghỉ phép, sửa công và tăng ca (OT). Linh hoạt hiển thị và gộp giờ OT thẳng vào biểu đồ tổng mà không cần chờ logs thực tế.
- 📈 **Báo cáo Tự động**: Hệ thống tự động tổng hợp dữ liệu làm việc (Daily Summary) mỗi ngày để phục vụ tính lương.

### 🔒 Bảo mật & Hệ thống
- 🔐 **MFA (Multi-Factor Authentication)**: Bảo vệ tài khoản với mã xác thực 2 lớp (TOTP).
- 🛡️ **Invisible reCAPTCHA v3**: Chặn Bot tự động mà không làm phiền trải nghiệm người dùng tại các trang đăng nhập.
- 🛂 **Phân quyền (RBAC)**: Hệ thống quyền hạn chặt chẽ (Admin, HR, Manager, Member) dựa trên Row Level Security (RLS) của Supabase.
- 🌐 **Đa ngôn ngữ**: Hỗ trợ hoàn chỉnh Tiếng Việt và Tiếng Anh.

---

## 🛠️ Công nghệ cốt lõi

- **Frontend**: Next.js 15 (App Router), Tailwind CSS, Shadcn UI.
- **Backend**: Supabase (PostgreSQL, Realtime, Storage, Edge Functions).
- **Authentication**: Supabase Auth + MFA.
- **Notifications**: Firebase Cloud Messaging (FCM).
- **Automation**: pg_cron (Supabase) cho các tác vụ quét lịch trình và tính toán báo cáo tự động.
- **Security**: Google reCAPTCHA v3.

---

## 🚀 Hướng dẫn cài đặt

### 1. Yêu cầu hệ thống
- Node.js 20+
- Tài khoản Supabase và Firebase.

### 2. Cài đặt Dependencies
```bash
git clone https://github.com/hoangtrismpk/cham-cong.git
cd cham-cong
npm install
```

### 3. Cấu hình Biến môi trường
Tạo tệp `.env.local` tại thư mục gốc và điền các thông tin sau:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Firebase (Client)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Security
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_site_key
RECAPTCHA_SECRET_KEY=your_secret_key
```

### 4. Khởi chạy Local
```bash
npm run dev
```

---

## 🏗️ Kiến trúc Dữ liệu (Schema Overview)

Hệ thống được xây dựng trên một schema tối ưu cho việc tính toán công:
- `profiles`: Lưu thông tin nhân sự và loại hợp đồng (Full-time, Part-time, Intern).
- `attendance_logs`: Ghi lại mỗi lần check-in/out kèm vị trí/IP.
- `leave_requests`: Quản lý các loại nghỉ phép.
- `overtime_requests`: Quản lý, phê duyệt số giờ tăng ca (OT) của nhân viên. Dữ liệu này được kết xuất qua `attendance_logs`.
- `daily_work_summary`: Bảng tổng hợp được hệ thống tự động tính toán số giờ làm việc thực tế, giờ nghỉ và giờ được trả lương hàng ngày.

---

## 📄 Giấy phép
Dự án được phát hành dưới giấy phép [MIT](LICENSE).

---
Được xây dựng và duy trì bởi **Hoàng Trí** & **Tiger Agent**.
