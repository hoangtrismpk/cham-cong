# TODO: Integrate Audit Logging vào Approvals & Settings

## Approvals Integration

**Cần thêm audit logging vào các functions sau trong `app/actions/approvals.ts` hoặc component client:**

### 1. Approve Leave Request
```typescript
import { createAuditLog } from './audit-logs'

// Khi approve leave request
await createAuditLog({
    action: 'APPROVE',
    resourceType: 'leave_request',
    resourceId: leaveRequestId,
    description: `Duyệt đơn nghỉ phép của ${employeeName}`,
    oldValues: { status: 'pending' },
    newValues: { 
        status: 'approved',
        approved_by: adminName,
        approved_at: new Date().toISOString()
    }
})
```

### 2. Reject Leave Request
```typescript
await createAuditLog({
    action: 'REJECT',
    resourceType: 'leave_request',
    resourceId: leaveRequestId,
    description: `Từ chối đơn nghỉ phép của ${employeeName}`,
    oldValues: { status: 'pending' },
    newValues: { 
        status: 'rejected',
        rejected_by: adminName,
        reject_reason: reason
    }
})
```

### 3. Approve Attendance Edit
```typescript
await createAuditLog({
    action: 'APPROVE',
    resourceType: 'attendance',
    resourceId: changeRequestId,
    description: `Duyệt yêu cầu sửa chấm công của ${employeeName}`,
    oldValues: { 
        original_checkin: oldCheckin,
        original_checkout: oldCheckout
    },
    newValues: { 
        new_checkin: newCheckin,
        new_checkout: newCheckout
    }
})
```

---

## Settings Integration

**Cần thêm audit logging vào `app/actions/settings.ts`:**

### 1. Update Single Setting
```typescript
// In updateSetting() function
await createAuditLog({
    action: 'UPDATE',
    resourceType: 'setting',
    resourceId: key,
    description: `Cập nhật cấu hình: ${key}`,
    oldValues: { [key]: oldValue },
    newValues: { [key]: newValue }
})
```

### 2. Bulk Update Settings
```typescript
// In updateSettings() function
await createAuditLog({
    action: 'UPDATE',
    resourceType: 'setting',
    description: `Cập nhật ${updates.length} cấu hình hệ thống`,
    oldValues: oldSettings,
    newValues: newSettings
})
```

---

## Implementation Steps

1. **Locate approve/reject functions** trong approvals hoặc component
2. **Add import**: `import { createAuditLog } from '@/app/actions/audit-logs'`
3. **Add audit call** sau mỗi successful action
4. **Test thoroughly** với từng loại request

---

## Checklist

- [ ] Approve Leave Request
- [ ] Reject Leave Request  
- [ ] Approve Attendance Edit
- [ ] Reject Attendance Edit
- [ ] Update Setting (single)
- [ ] Update Settings (bulk)
- [ ] Update Work Hours
- [ ] Update Location Settings
- [ ] Update Security Settings

---

**Note:** Cần tìm chính xác vị trí các approve/reject functions được implement để thêm audit logging. Có thể ở client component hoặc trong separate action files.
