# Plan: Giao diện Thống kê Chi tiết Báo cáo Nhân viên (Employee Report Analytics)

## 1. Mục tiêu
Xây dựng trang Dashboard chi tiết cho từng nhân viên để Admin theo dõi ý thức nộp báo cáo trong tháng, xem lịch sử đúng hạn/trễ hạn và nội dung tóm tắt.

## 2. Công việc thực hiện

### A. Backend (Server Actions)
- Tạo hàm `getEmployeeReportAnalytics` trong `app/actions/work-reports-admin.ts`:
    - Lấy thông tin Profile (Họ tên, mã NV, job title).
    - Lấy danh sách báo cáo của NV trong tháng cụ thể.
    - Tính toán: Tổng ngày yêu cầu (working days), Đã nộp, Đúng hạn, Trễ hạn, Thiếu.
    - Trả về danh sách map theo ngày để phục vụ Calendar View.

### B. Routing
- Tạo cấu trúc: `app/admin/reports/employee/[id]/page.tsx`.

### C. Frontend (UI Components)
- Tạo component `EmployeeReportAnalytics`:
    - **Header**: Thanh điều hướng quay lại, Avatar, Dropdown Tháng/Năm.
    - **Stats Card Grid**: 4 khối thống kê theo chuẩn design.
    - **Calendar View (Grid)**: Hiển thị 7 cột (Sun-Sat), render các ngày trong tháng với trạng thái màu sắc và giờ nộp.
    - **Summary List**: Danh sách báo cáo chi tiết phía dưới.

## 3. Tech Stack & Styling
- **Next.js 15 (App Router)**.
- **Tailwind CSS** (Premium Dark Mode).
- **Lucide React** (Icons).
- **Date-fns** (Xử lý logic lịch).

## 4. Tiến độ
1. Sửa/Thêm Server Action.
2. Tạo Page & Component.
3. Kiểm tra logic đúng hạn/trễ hạn.
