# 🔐 Phase 1: Secure Admin - Triển khai hoàn tất

## ✅ Đã hoàn thành

### 1. Migration: Bổ sung Permissions mới
**File:** `supabase/migrations/20260206_add_missing_permissions.sql`

**Permissions mới (7 permissions):**
- `dashboard.view` - Truy cập Dashboard Admin
- `approvals.view` - Xem danh sách yêu cầu
- `approvals.approve` - Duyệt/Từ chối yêu cầu
- `leaves.view` - Xem danh sách nghỉ phép
- `leaves.approve` - Duyệt nghỉ phép
- `leaves.create_for_others` - Tạo đơn nghỉ cho người khác
- `notifications.manage` - Quản lý thông báo hệ thống

**Roles được cập nhật:**
- **Admin**: Vẫn giữ wildcard `*` (toàn quyền)
- **Accountant**: Thêm `approvals.view`, `dashboard.view`
- **Member**: Không có quyền admin (array rỗng)

**Roles mới:**
- **Manager**: 9 quyền (duyệt approve, xem báo cáo)
- **HR**: 9 quyền (quản lý nhân viên, chấm công)

---

### 2. Middleware bảo vệ Admin Routes
**File:** `app/admin/middleware.ts`

**Chức năng:**
- ✅ Kiểm tra authentication
- ✅ Redirect về `/auth/login` nếu chưa đăng nhập
- ✅ Kiểm tra permissions chi tiết cho từng route
- ✅ Support wildcard (`*` và `resource.*`)
- ✅ Redirect về `/unauthorized` nếu không có quyền

**Route Mapping:**
```
/admin                    → dashboard.view
/admin/employees          → users.view
/admin/approvals          → approvals.view
/admin/settings/*         → settings.view
/admin/settings/roles     → roles.view
/admin/attendance         → attendance.view
/admin/reports            → reports.view
```

---

### 3. Unauthorized Page
**File:** `app/unauthorized/page.tsx`

**UI Features:**
- ⚠️ Icon cảnh báo lớn (ShieldAlert)
- 📝 Thông báo rõ ràng "Không có quyền truy cập"
- 🔙 Nút quay về trang chủ hoặc dashboard
- 🎨 Design thống nhất với hệ thống

---

### 4. Permission Guard Component
**File:** `components/permission-guard.tsx`

**Exports:**
- `<PermissionGuard>` - Component wrapper
- `usePermission()` - Hook để check permissions

**Cách dùng:**
```tsx
// Component
<PermissionGuard permission="users.edit" fallback={<p>Không có quyền</p>}>
  <Button>Chỉnh sửa</Button>
</PermissionGuard>

// Hook
const { hasPermission, loading } = usePermission('users.delete')
if (!hasPermission) return null
```

---

### 5. Smart Sidebar với Permission Filtering
**File:** `components/admin-sidebar.tsx`

**Cải tiến:**
- ✅ Load permissions từ profile
- ✅ Tự động ẩn menu items user không có quyền
- ✅ Support wildcard checking
- ✅ Hiển thị tên công ty dynamic từ settings

**Logic:**
```typescript
// Chỉ hiển thị menu nếu user có quyền
const visibleLinks = links.filter(link => hasPermission(link.permission))
```

---

### 6. Profile Actions - Load Permissions
**File:** `app/actions/profile.ts`

**Update:**
- Thêm `permissions` vào query `getMyProfile()`
- Sidebar có thể filter menu ngay khi load

---

## 📋 Hướng dẫn Triển khai

### Bước 1: Chạy Migration trên Supabase Dashboard

Vì migration history bị conflict, bạn cần:

1. Mở **Supabase Dashboard** → **SQL Editor**
2. Copy toàn bộ nội dung file `supabase/migrations/20260206_add_missing_permissions.sql`
3. Paste và **Run** migration
4. Kiểm tra kết quả:
   - Bảng `available_permissions` có 7 records mới
   - Bảng `roles` có 2 roles mới (manager, hr)
   - Role accountant được update permissions

### Bước 2: Test Permission System

#### Test 1: Admin (Wildcard)
- Login với tài khoản admin
- ✅ Nên thấy **tất cả** menu items: Overview, Employees, Approvals, Attendance, Reports, Settings
- ✅ Có thể truy cập mọi trang admin

#### Test 2: Accountant
- Login với tài khoản accountant
- ✅ Chỉ thấy: Overview, Approvals, Reports
- ❌ KHÔNG thấy: Employees, Attendance, Settings
- ❌ Truy cập `/admin/employees` → Redirect to `/unauthorized`

#### Test 3: Member
- Login với tài khoản member  
- ❌ KHÔNG có menu admin nào
- ❌ Truy cập `/admin` → Redirect to `/unauthorized`

#### Test 4: Manager (Role mới)
- Tạo user mới với role "Manager"
- ✅ Thấy: Overview, Employees (view-only), Approvals, Reports
- ✅ Có thể duyệt/từ chối approvals
- ❌ KHÔNG thấy: Settings

#### Test 5: HR (Role mới)
- Tạo user mới với role "HR"
- ✅ Thấy: Overview, Employees (full access)
- ✅ Có thể thêm/sửa nhân viên
- ❌ KHÔNG thấy: Reports, Settings

---

## 🎯 Lợi ích đạt được

1. ✅ **Bảo mật tăng cường**: Chặn truy cập trái phép vào admin panel
2. ✅ **UX tốt hơn**: Chỉ hiển thị menu user được phép dùng
3. ✅ **Dễ quản lý**: Admin có thể phân quyền chi tiết từ UI
4. ✅ **Scalable**: Dễ thêm permissions mới khi có tính năng mới
5. ✅ **Audit-ready**: Sẵn sàng cho Phase 2 (Audit Log)

---

## 🚀 Phase 2: Next Steps (Tùy chọn)

### A. Audit Log
- Log mọi hành động admin (approve, reject, delete, edit)
- Hiển thị "Ai làm gì, khi nào" trong dashboard

### B. Fine-grained Permissions
- Phân quyền đến level field (VD: `users.edit.salary`)
- Permission cho từng department

### C. Role Templates
- UI chọn template khi tạo role mới
- One-click setup cho các vai trò phổ biến

### D. Dynamic Permission Loading
- Realtime update khi admin thay đổi permissions
- Không cần logout/login lại

---

## ⚠️ Lưu ý quan trọng

1. **Middleware chỉ chạy server-side**: Client vẫn có thể thấy HTML nếu inspect network. Luôn validate lại ở server actions.

2. **Permissions trong database**: Nếu update role permissions trong dashboard, user cần refresh page hoặc logout/login để thấy thay đổi.

3. **Member role**: Mặc định không có quyền admin. Nếu muốn cho member vào một số trang admin, cần assign role khác.

4. **Development**: Trong dev mode, có thể tạm thời comment middleware để test nhanh.

---

## 📞 Support

Nếu gặp vấn đề:
1. Check Supabase logs: Dashboard → Logs
2. Check browser console: F12 → Console
3. Verify role assignment: SQL Editor → `SELECT * FROM profiles JOIN roles ON profiles.role_id = roles.id`
4. Test permissions: SQL Editor → `SELECT check_user_permission('[USER_ID]', 'users.view')`

---

**Thời gian triển khai:** ~30 phút  
**Status:** ✅ Sẵn sàng deploy  
**Breaking Changes:** Không  
**Database Migration:** Required (20260206_add_missing_permissions.sql)
