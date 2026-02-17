# 🐛 Debug Report - Managers List Issue

**Vấn đề**: Danh sách quản lý không hiện ra

---

## ✅ Đã sửa:

### 1. **Logic load managers sai**
**Trước**:
```typescript
// Filter by role name (sai vì không có role 'manager')
const roleName = profile.roles?.name?.toLowerCase()
return roleName === 'admin' || roleName === 'manager' || roleName === 'quản lý'
```

**Sau**:
```typescript
// Filter by permissions (đúng!)
const permissions = role.permissions || []
const roleName = role.name?.toLowerCase()

// Admin has all permissions
if (permissions.includes('*')) return true

// Has reports.view permission
if (permissions.includes('reports.view')) return true
if (permissions.includes('reports.*')) return true

// Or is admin/accountant role
if (roleName === 'admin' || roleName === 'accountant') return true
```

### 2. **Query Supabase thiếu thông tin**
**Trước**:
```typescript
.select('id, full_name, email, job_title, roles(name)')
```

**Sau**:
```typescript
.select(`
    id, 
    full_name, 
    email, 
    job_title,
    role_id,
    roles (
        name,
        display_name,
        permissions
    )
`)
.not('role_id', 'is', null)
```

### 3. **Hiển thị role name**
**Trước**:
```typescript
<p>{manager.job_title || manager.email}</p>
```

**Sau**:
```typescript
<p>{(manager as any).roles?.display_name || manager.email}</p>
```

---

## 🎯 Kết quả:

Bây giờ sẽ hiển thị:
- ✅ **Admin** (Quản trị viên)
- ✅ **Accountant** (Kế toán)
- ❌ **Member** (Thành viên) - Không hiển thị vì không có quyền xem reports

---

## 📝 Console logs để debug:

```typescript
console.log('Managers found:', managersList.length)
console.error('Error loading managers:', error)
console.log('No users found with roles')
```

Mở DevTools (F12) → Console để xem logs!

---

**Fixed by**: Tiger 🐯  
**Date**: 2026-02-07
