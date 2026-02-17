# Tóm tắt Triển khai: Thống kê Đi trễ (Late Statistics)

Đã hoàn thành việc thêm tính năng thống kê thời gian đi trễ vào Dashboard theo yêu cầu.

## 1. Backend API (`app/actions/attendance.ts`)
- Đã cập nhật hàm `getAttendanceStats` để tính toán thêm:
  - `totalLateCount`: Tổng số lần đi trễ trong kỳ (Tuần/Tháng).
  - `totalLateMinutes`: Tổng số phút đi trễ.
  - `dailyStats.lateMinutes`: Số phút đi trễ chi tiết từng ngày.
- Logic tính toán dựa trên trạng thái `log.status === 'late'` và trường `log.late_minutes` từ cơ sở dữ liệu.

## 2. Frontend Component (`components/dashboard-cards.tsx`)
- Cập nhật **AttendanceProgressCard**:
  - Thêm phần hiển thị **"Đi trễ" (Late Arrivals)** trong phần tóm tắt đầu trang.
  - Hiển thị format: `Số lần x Tổng phút` (Ví dụ: `2 x 45m`).
  - Cập nhật biểu đồ cột: Thêm một vạch chỉ thị màu đỏ (`rose-500`) phía dưới cột ngày tương ứng nếu ngày đó có đi trễ.
  - Thêm chú thích (Legend) cho màu đỏ đ đ trễ.
  - Tooltip của biểu đồ giờ đây hiển thị thêm thông tin số phút trễ nếu có.

## 3. Đa ngôn ngữ (i18n)
- Đã cập nhật file ngôn ngữ `vi.ts` và `en.ts`:
  - `dashboard.lateArrivals`: "Đi trễ" / "Late Arrivals"
  - `dashboard.lateCount`: "Số lần" / "Count"
  - `dashboard.lateMinutes`: "Số phút" / "Minutes"

## Kết quả
- Người dùng có thể xem nhanh tình hình đi muộn của mình ngay trên Dashboard theo góc nhìn Tuần và Tháng.
- Giao diện đồng bộ với thiết kế hiện tại, sử dụng màu đỏ cảnh báo nhẹ nhàng nhưng rõ ràng.
