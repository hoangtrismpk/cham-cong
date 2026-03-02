# Kế hoạch Triển khai: Push Nhắc Nhở Báo Cáo

## 1. Cấu hình Hạ tầng & Cơ sở dữ liệu (Database & Env)
- [x] Thêm biến môi trường `CRON_SECRET` vào Vercel / `.env.local`
- [x] Bổ sung bảng/cột để lưu vết các thông báo đã gửi (tùy chọn - nếu cần chống spam tuyệt đối)
- [x] Xác minh cấu hình Firebase Admin cho việc gửi FCM (hiện đã có `firebase-admin`).

## 2. Xây dựng API Đầu cuối (API Routes)
- [x] Tạo file `app/api/cron/daily-remind/route.ts` (GET)
- [x] Tạo file `app/api/cron/weekly-remind/route.ts` (GET)
- [x] Implement bảo mật cho 2 API này (chỉ cho phép gọi bằng `CRON_SECRET`)

## 3. Logic: Báo cáo hằng ngày (Daily Remind)
- [x] Lấy danh sách Users có FCM token hợp lệ
- [x] Tính toán thời gian: quét những user có `work_end_time` rơi vào 30 phút sau thời điểm chạy lệnh (handling múi giờ VN)
- [x] Query bảng `leaves`: Loại trừ user nghỉ *Nguyên ngày* (`status = 'approved'`, `type = 'full_day'`)
- [x] Query bảng `reports`: Loại trừ user *đã nộp báo cáo* ngày hôm đó
- [x] Pick random nội dung tin nhắn Daily từ list 7 câu (Title + Body).
- [x] Gọi Firebase Admin FCM gửi thông báo (Batch / Multicast)
- [x] Thêm fallback xóa các FCM token đã chết.

## 4. Logic: Báo cáo hằng tuần (Weekly Remind)
- [x] Lấy danh sách toàn bộ Users có FCM token
- [x] Triển khai random nội dung Weekly
- [x] Gửi thông báo bằng Firebase Admin FCM (Multicast)

## 5. Test & Cấu hình Cron
- [x] Thay file `vercel.json` khai báo crons:
  - `hourly` hoặc `every 15 mins` gọi `/api/cron/daily-remind`
  - `0 8 * * 1` (8h sáng T2) gọi `/api/cron/weekly-remind`
- [x] Local Test bằng cách gọi trực tiếp route API (dùng Postman / cURL)

## 6. Review & Học hỏi
- [x] Ghi chú bài học vào `tasks/lessons.md` sau khi code xong.
