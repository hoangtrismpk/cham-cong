# 📊 Phase 2A: Audit Log System - Hoàn thành

## ✅ Đã triển khai

### 1. Database Schema ✅
**File:** `supabase/migrations/20260206_create_audit_logs.sql`

**Bảng `audit_logs`:**
```sql
- id (UUID, PK)
- user_id, user_email, user_name, user_role
- action (CREATE, UPDATE, DELETE, APPROVE, REJECT, etc.)
- resource_type (user, role, setting, approval, etc.)
- resource_id
- description (human-readable)
- old_values (JSONB) - State trước khi thay đổi
- new_values (JSONB) - State sau khi thay đổi
- ip_address, user_agent
- status (SUCCESS, FAILED)
- created_at
```

**Indexes cho performance:**
- `idx_audit_logs_user_id`
- `idx_audit_logs_action`
- `idx_audit_logs_resource_type`
- `idx_audit_logs_created_at`
- `idx_audit_logs_composite` (user_id + resource_type + created_at)

**Helper Function:**
- `create_audit_log()` - Tự động capture user info, insert log
- `cleanup_old_audit_logs()` - Xóa logs > 90 ngày (optional)

---

### 2. Server Actions ✅
**File:** `app/actions/audit-logs.ts`

**Exports:**
- `createAuditLog()` - Tạo log entry (auto-capture IP, user agent)
- `getAuditLogs()` - Fetch logs với pagination & filters
- `getAuditStats()` - Thống kê (total, action counts, recent activity)
- `exportAuditLogs()` - Export to CSV

**TypeScript Types:**
```typescript
type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | ...
type ResourceType = 'user' | 'role' | 'setting' | 'approval' | ...
interface AuditLogEntry { ... }
```

---

### 3. Integration vào Roles Actions ✅
**File:** `app/actions/roles.ts`

**Functions đã tích hợp audit logging:**

1. **createRole()** ✅
   ```typescript
   action: 'CREATE'
   resourceType: 'role'
   description: "Tạo vai trò mới: [role_name]"
   newValues: { name, display_name, permissions }
   ```

2. **updateRole()** ✅
   ```typescript
   action: 'UPDATE'
   resourceType: 'role'
   description: "Cập nhật vai trò: [role_name]"
   oldValues: { old permissions, description }
   newValues: { new permissions, description }
   ```

3. **deleteRole()** ✅
   ```typescript
   action: 'DELETE'
   resourceType: 'role'
   description: "Xóa vai trò: [role_name]"
   oldValues: { name, display_name, permissions }
   ```

4. **assignRoleToUser()** ✅
   ```typescript
   action: 'ASSIGN_ROLE'
   resourceType: 'user'
   description: "Gán vai trò '[new_role]' cho [user_name]"
   oldValues: { role: old_role_name }
   newValues: { role: new_role_name }
   ```

---

## 📋 Cần hoàn thành tiếp (UI)

### A. Audit Logs Viewer Page
**Location:** `app/admin/audit-logs/page.tsx`

**Features cần có:**
- ✅ Table hiển thị logs (user, action, resource, time)
- ✅ Pagination
- ✅ Filters:
  - Action (CREATE, UPDATE, DELETE, etc.)
  - Resource Type
  - User
  - Date Range
- ✅ Export to CSV button
- ✅ Real-time update (optional)
- ✅ View detailed changes (expand row to see old_values/new_values)

**Design:**
- Similar to `/admin/approvals` page
- Use Card components for each log entry
- Color-coded badges for actions:
  - CREATE: Green
  - UPDATE: Blue
  - DELETE: Red
  - APPROVE: Purple
  - REJECT: Orange

---

### B. Audit Stats Widget for Dashboard
**Location:** `app/admin/page.tsx`

**Metrics to show:**
- Total logs (last 30 days)
- Action breakdown (pie chart or bar chart)
- Recent activity (last 10 logs)
- Most active users

---

### C. Additional Integrations

**Cần thêm audit logging vào:**

1. **Approvals** (`app/actions/approvals.ts`)
   - `approveActivity()` → action: 'APPROVE', resourceType: 'approval'
   - `rejectActivity()` → action: 'REJECT', resourceType: 'approval'

2. **Settings** (`app/actions/settings.ts`)
   - `updateSetting()` → action: 'UPDATE', resourceType: 'setting'
   - `updateSettings()` → action: 'UPDATE', resourceType: 'setting'

3. **Employees** (`app/actions/employees.ts`)
   - `createEmployee()` → action: 'CREATE', resourceType: 'user'
   - `updateEmployee()` → action: 'UPDATE', resourceType: 'user'
   - `deleteEmployee()` → action: 'DELETE', resourceType: 'user'

4. **Schedules** (if exists)
   - CREATE/UPDATE/DELETE schedules

---

## 🎯 Lợi ích đạt được

1. **✅ Transparency**: Mọi thay đổi đều được ghi lại
2. **✅ Security**: Track unauthorized actions
3. **✅ Compliance**: Đáp ứng yêu cầu audit (GDPR, SOC 2)
4. **✅ Accountability**: Biết "Ai làm gì, khi nào"
5. **✅ Debugging**: Dễ trace lại nguyên nhân lỗi
6. **✅ Analytics**: Hiểu user behavior patterns

---

## 📊 Example Logs

### Log #1: Tạo role mới
```json
{
  "user_name": "Nguyen Van A",
  "user_role": "Admin",
  "action": "CREATE",
  "resource_type": "role",
  "description": "Tạo vai trò mới: Kế toán trưởng",
  "new_values": {
    "name": "ke_toan_truong",
    "display_name": "Kế toán trưởng",
    "permissions": ["reports.*", "attendance.view"]
  },
  "ip_address": "192.168.1.100",
  "created_at": "2026-02-06T19:25:00Z"
}
```

### Log #2: Update role
```json
{
  "user_name": "Tran Thi B",
  "user_role": "Admin",
  "action": "UPDATE",
  "resource_type": "role",
  "description": "Cập nhật vai trò: Manager",
  "old_values": {
    "permissions": ["approvals.view", "users.view"]
  },
  "new_values": {
    "permissions": ["approvals.view", "approvals.approve", "users.view"]
  },
  "created_at": "2026-02-06T19:30:00Z"
}
```

### Log #3: Assign role
```json
{
  "user_name": "Admin",
  "action": "ASSIGN_ROLE",
  "resource_type": "user",
  "resource_id": "user-123",
  "description": "Gán vai trò 'HR' cho Nguyen Van C",
  "old_values": { "role": "Member" },
  "new_values": { "role": "HR" },
  "created_at": "2026-02-06T19:35:00Z"
}
```

---

## 🚀 Next Steps

### Immediate (Ngay lập tức):
1. Test audit logging bằng cách:
   - Tạo role mới trong `/admin/settings/roles`
   - Check database: `SELECT * FROM audit_logs ORDER BY created_at DESC`
   - Verify có log entry đúng format

### Short-term (1-2 ngày):
2. Tạo UI Audit Logs Viewer
3. Thêm audit logging vào Approvals, Settings
4. Add audit stats widget to dashboard

### Medium-term (1 tuần):
5. Implement real-time log streaming
6. Add advanced filters (multi-select, date picker)
7. Add log retention policies

### Long-term (Optional):
8. Integrate with external SIEM tools
9. Anomaly detection (suspicious actions)
10. Automated alerts for critical actions

---

## 🧪 Testing Checklist

- [ ] Tạo role mới → Check audit log created
- [ ] Update role → Check old_values/new_values correct
- [ ] Delete role → Check log with old_values
- [ ] Assign role to user → Check description mentions user name
- [ ] Verify IP address captured
- [ ] Verify RLS: Non-admin cannot see logs
- [ ] Test pagination & filters
- [ ] Test CSV export

---

## 📞 Support Queries

```sql
-- View all logs
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50;

-- Logs by specific user
SELECT * FROM audit_logs WHERE user_email = 'admin@example.com';

-- Logs for specific action
SELECT * FROM audit_logs WHERE action = 'DELETE';

-- Recent role changes
SELECT * FROM audit_logs 
WHERE resource_type = 'role' 
ORDER BY created_at DESC 
LIMIT 20;

-- Get stats
SELECT 
  action, 
  COUNT(*) as count 
FROM audit_logs 
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY action 
ORDER BY count DESC;
```

---

**Status:** ✅ Phase 2A Core Complete  
**Next:** Build UI for Audit Logs Viewer  
**Breaking Changes:** None  
**Dependencies:** Supabase RPC functions
