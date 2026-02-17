# Kế hoạch Triển khai Hệ thống Phân quyền Chi tiết (Granular RBAC)

## 🎯 Mục tiêu
Chuyển đổi từ hệ thống phân quyền đơn giản (Admin/User) sang hệ thống phân quyền chi tiết theo hành động (Granular Permissions) để đáp ứng nhu cầu bảo mật và vận hành thực tế (Manager, HR, Accountant).

---

## 📅 Lộ trình Triển khai

### 🚩 Phase 1: Tạo Nền móng & Định nghĩa (Database) - [IN PROGRESS]
**Mục tiêu:** Chuẩn hóa dữ liệu permissions và roles trong Database.
- [ ] **1.1. Chuẩn hóa `available_permissions`**: Định nghĩa danh sách khoảng 30 quyền chi tiết (View salary, Export reports...).
- [ ] **1.2. Update Roles**: Cập nhật lại permissions cho các role mặc định (`manager`, `hr`, `accountant`) khớp với danh sách mới.

### 🛡️ Phase 2: Củng cố "Người gác cổng" (Middleware & Backend) - [PENDING]
**Mục tiêu:** Bảo vệ API và Server Actions.
- [ ] **2.1. Nâng cấp Middleware**: Mapping lại route `/admin/*` với các permission chi tiết hơn.
- [ ] **2.2. Helper `checkPermission`**: Tạo hàm helper thống nhất để check quyền trong Server Actions.
- [ ] **2.3. Secure Actions**: Áp dụng `checkPermission` vào các file `actions/employees.ts`, `actions/attendance.ts`... đặc biệt là Logic xem lương/nhạy cảm.

### 🎛️ Phase 3: Giao diện Quản lý Role (Admin UI) - [PENDING]
**Mục tiêu:** Admin có thể cấu hình quyền trên giao diện.
- [ ] **3.1. Trang danh sách Roles**: Xem danh sách các role.
- [ ] **3.2. Permission Matrix Widget**: Bảng ma trận checkbox để bật/tắt quyền cho Role.
- [ ] **3.3. Create/Edit Role**: Cho phép tạo role tùy chỉnh (ví dụ: "Tuyển dụng", "Bảo vệ").

### 🎨 Phase 4: Trải nghiệm Người dùng (Frontend UX) - [PENDING]
**Mục tiêu:** UI phản hồi theo quyền hạn user.
- [ ] **4.1. Update Sidebar**: Ẩn/hiện menu item dựa trên permission list mới.
- [ ] **4.2. PermissionGuard Component**: Component bọc để ẩn nút (ví dụ: nút "Edit").
- [ ] **4.3. Error Handling**: Toast notification thân thiện thay vì redirect lỗi.

---

## 📋 Danh sách Permissions Chi tiết (Dự kiến Phase 1)

### 1. User Management
- `users.view`: Xem danh sách (cơ bản)
- `users.view_salary`: **Xem lương & Hợp đồng (Nhạy cảm)**
- `users.create`: Tạo nhân viên
- `users.edit`: Sửa thông tin
- `users.delete`: Xóa/Ban nhân viên

### 2. Attendance (Chấm công)
- `attendance.view`: Xem công
- `attendance.edit`: **Sửa công (Nhạy cảm)**
- `attendance.export`: Xuất báo cáo

### 3. Leave & Approvals
- `leaves.view`: Xem lịch nghỉ
- `leaves.approve`: Duyệt nghỉ phép
- `leaves.create_for_others`: Tạo đơn hộ
- `approvals.view`: Xem list yêu cầu
- `approvals.approve`: Duyệt yêu cầu chung

### 4. Admin System
- `dashboard.view`: Truy cập Dashboard
- `settings.view`: Xem cấu hình
- `settings.manage`: Sửa cấu hình
- `roles.manage`: Quản lý phân quyền
