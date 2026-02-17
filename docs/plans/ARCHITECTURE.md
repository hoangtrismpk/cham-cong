# Kiến trúc Dự án Cham-Cong

Dự án được xây dựng theo kiến trúc **Full-stack Serverless**, tận dụng tối đa sức mạnh của Next.js (Frontend/API) và Supabase (Backend/Database).

## 🔋 Tổng quan Công nghệ
- **Next.js (App Router)**: Đảm nhận phần UI, Routing và Server Actions để xử lý logic chấm công.
- **Supabase**:
    - **PostgreSQL**: Lưu trữ dữ liệu nhân viên, lịch trình, chấm công.
    - **Auth**: Quản lý đăng nhập/đăng ký (JWT).
    - **Edge Functions**: Xử lý các tác vụ ngầm (Background Jobs) và tích hợp bên thứ ba (Firebase).
- **Firebase Messaging**: Cung cấp hạ tầng gửi Push Notification.

## 📁 Cấu trúc Thư mục
- `/app`: Chứa các trang (pages) và Server Actions.
- `/components`: Các UI Components tái sử dụng.
- `/contexts`: Quản lý State toàn cục (I18n, Sidebar).
- `/lib`: Chứa các tiện ích, cấu hình database client.
- `/supabase`: Chứa các file Migrations và Edge Functions.
- `/public`: Chứa tài nguyên tĩnh và Service Worker.

## 🔄 Luồng dữ liệu chính (Data Flow)

### Chấm công (Check-in/Check-out)
1. User nhấn Check-in trên Client.
2. Client lấy vị trí GPS và IP Public.
3. Client gọi Server Action `attendance.ts`.
4. Server xác thực vị trí theo thứ tự ưu tiên:
    - **IP Wifi**: Nếu khớp với danh sách IP Admin đã cấu hình -> Hợp lệ ngay.
    - **GPS**: Nếu IP không khớp, kiểm tra khoảng cách tới tọa độ văn phòng (mặc định < 100m).
5. Lưu kết quả vào Database.

### Thông báo nhắc nhở (Reminder)
1. `pg_cron` gọi `check-reminder` Edge Function mỗi 5 phút.
2. Function tìm ca làm việc sắp diễn ra.
3. Function gửi Push qua Firebase FCM.
4. User nhận thông báo trên điện thoại nhờ Service Worker.

## 🔒 Bảo mật
- **Google reCAPTCHA v3**: Tích hợp xác thực "tàng hình" trên các Form nhạy cảm. Token được verify server-side trước khi xử lý yêu cầu.
- **RLS (Row Level Security)**: Đảm bảo nhân viên chỉ xem được dữ liệu của chính mình.
- **Service Role**: Chỉ Edge Functions và Server Actions mới có quyền ghi dữ liệu nhạy cảm.
- **JWT**: Xác thực mọi yêu cầu từ Client.

## 🛠️ Module Quản trị & Chẩn đoán
- **System Settings**: Hệ thống cấu hình động (hỗ trợ JSONB) cho phép Admin thay đổi tham số hệ thống (Giờ làm, IP, reCAPTCHA Key) mà không cần deploy lại code.
- **Diagnostic Tool (`/debug-ip`)**: Cung cấp giao diện kiểm tra IP thời gian thực và test kết nối reCAPTCHA live cho cả Client và Server.

---
*Tài liệu được cập nhật bởi Tiger Agent - 2026-02-05*
