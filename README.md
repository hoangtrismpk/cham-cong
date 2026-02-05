# 🕒 Cham-Cong - Hệ thống Chấm công Thông minh

Hệ thống quản lý chấm công hiện đại dành cho doanh nghiệp, tích hợp thông báo đẩy và quản lý lịch trình làm việc thời gian thực.

## ✨ Tính năng nổi bật
- 📍 **Chấm công GPS**: Đảm bảo nhân viên ở đúng vị trí công ty khi điểm danh.
- 🔔 **Thông báo nhắc nhở**: Tự động bắn thông báo nhắc check-in/check-out trước ca làm 5-10 phút.
- 📅 **Quản lý lịch trình**: Theo dõi ca làm việc, ngày nghỉ và thống kê công sự.
- 📱 **Hỗ trợ PWA**: Cài đặt như một ứng dụng trên điện thoại, hỗ trợ tốt nhất cho di động.
- 🌐 **Đa ngôn ngữ**: Hỗ trợ đầy đủ tiếng Việt và tiếng Anh.

## 🛠️ Công nghệ sử dụng
- **Frontend**: [Next.js 15](https://nextjs.org/) (App Router), Tailwind CSS.
- **Backend**: [Supabase](https://supabase.com/) (Database, Auth, Edge Functions).
- **Notifications**: [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging).
- **Deployment**: [Vercel](https://vercel.com/).

## 🚀 Hướng dẫn phát triển
1. **Cài đặt dependencies**:
   ```bash
   npm install
   ```
2. **Cấu hình môi trường**:
   Sao chép `.env.example` thành `.env.local` và điền đủ thông tin Supabase/Firebase.
3. **Chạy server local**:
   ```bash
   npm run dev
   ```

## 📖 Tài liệu nội bộ
- [Kiến trúc Push Notification](./docs/PUSH_NOTIFICATION_TECH.md)
- [Hướng dẫn kiểm thử Mobile](./MOBILE_TESTING.md)

---
Được xây dựng với ❤️ bởi Tiger Agent.
