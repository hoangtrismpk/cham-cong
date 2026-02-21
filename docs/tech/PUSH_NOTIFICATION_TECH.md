# Tài liệu Kỹ thuật: Hệ thống Thông báo Đẩy (Push Notifications)

> **Dự án**: Cham-Cong (Hệ thống Chấm công thông minh)
> **Trạng thái**: Đã triển khai (Production)

---

## 🏗️ Kiến trúc Hệ thống
Hệ thống sử dụng sự kết hợp giữa các dịch vụ Cloud để đảm bảo tính thời gian thực và tự động hóa:

1.  **Frontend (Next.js)**: Sử dụng Firebase Cloud Messaging (FCM) SDK để đăng ký Token và nhận thông báo trên trình duyệt/mobile.
2.  **Database (Supabase)**: Lưu trữ FCM Tokens của người dùng (`fcm_tokens`).
3.  **Backend Logic (Supabase Edge Functions)**: Hàm `check-reminder` viết bằng Deno, thực hiện quét lịch làm việc và gửi yêu cầu đẩy đến Firebase Admin SDK.
4.  **Trigger (pg_cron)**: Kích hoạt Edge Function mỗi 5 phút để kiểm tra các ca làm việc sắp diễn ra.
5.  **Firebase Cloud Messaging (FCM)**: Cầu nối gửi thông báo đến các thiết bị khách.

---

## 🛠️ Luồng hoạt động (Workflow)

### 1. Đăng ký nhận thông báo (Client)
- Khi người dùng đăng nhập, `FCMManager` sẽ yêu cầu quyền thông báo.
- Nếu được cho phép, lấy `FCM Token` từ Google.
- Lưu/Cập nhật Token này vào bảng `public.fcm_tokens` trong Supabase kèm theo `user_id`.

### 2. Quét và Nhắc nhở (Server)
- **Hành động**: `pg_cron` gọi Edge Function `check-reminder`.
- **Logic**:
    - Lấy giờ hiện tại theo múi giờ `Asia/Ho_Chi_Minh`.
    - Tìm trong bảng `work_schedules` các ca làm việc bắt đầu trong khoảng **5-10 phút** tới.
    - Lấy danh sách FCM Tokens của các `user_id` tương ứng.
    - Gửi thông báo qua Firebase Admin SDK.

---

## 🔐 Cấu hình Bảo mật & Biến môi trường

### Supabase Edge Functions Secrets:
- `FIREBASE_SERVICE_ACCOUNT`: Nội dung JSON của Service Account Firebase (Quyền Admin).
- `SUPABASE_SERVICE_ROLE_KEY`: Key có quyền bypass RLS để đọc danh sách Token.

### Vercel/Client Env:
- `NEXT_PUBLIC_FIREBASE_API_KEY`: Key để client kết nối FCM.
- `NEXT_PUBLIC_SUPABASE_URL`: Endpoint Database.

---

## ⚠️ Lưu ý khi bảo trì
1.  **Múi giờ**: Luôn sử dụng `Asia/Ho_Chi_Minh` (UTC+7) khi tính toán giờ nhắc nhở.
2.  **Token hết hạn**: Nếu người dùng xóa Cache trình duyệt hoặc đăng xuất, Token cũ sẽ không còn hiệu lực. Hệ thống sử dụng `UPSERT` để luôn giữ Token mới nhất.
3.  **SSL/HTTPS**: Thông báo đẩy **chỉ hoạt động** trên môi trường HTTPS (Vercel) hoặc `localhost`.

---
*Tài liệu được cập nhật tự động bởi Tiger Agent - 2026-02-04*
