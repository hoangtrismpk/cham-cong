# IMPLEMENTATION PLAN: Pagination for All List Pages

## Mục tiêu
Áp dụng phân trang server-side cho TẤT CẢ các trang có danh sách, tối đa 10 items/trang.

## Pattern chuẩn (từ Timesheets)
```typescript
// 1. State
const itemsPerPage = 10
const [currentPage, setCurrentPage] = useState(1)
const [pageInput, setPageInput] = useState('1')
const [totalCount, setTotalCount] = useState(0)
const totalPages = Math.ceil(totalCount / itemsPerPage)

// 2. Server Action với pagination
async function fetchData(page: number, limit: number) {
    // Supabase query with range
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    const { data, count } = await supabase
        .from('table_name')
        .select('*', { count: 'exact' })
        .range(from, to)
        .order('created_at', { ascending: false })
    
    return { data, totalCount: count }
}

// 3. UI Controls
<div className="flex items-center justify-between">
    <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}>Trước</button>
    <input value={pageInput} onChange={...} />
    <span>/ {totalPages}</span>
    <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}>Sau</button>
</div>
```

## Các trang cần áp dụng

### 1. Admin Approvals Page ✅ IN PROGRESS
- **File**: `app/admin/approvals/page.tsx`
- **Action**: `app/actions/approvals.ts` - `getActivities()`
- **Complexity**: Medium (2 bảng: leave_requests + change_requests)
- **Steps**:
  1. Update `getActivities()` để nhận `page`, `limit` 
  2. Thêm `.range(from, to)` và `count: 'exact'`
  3. Return `{ data, totalCount }`
  4. Update UI component thêm pagination controls

### 2. Admin Employees Page
- **File**: `app/admin/employees/page.tsx`
- **Action**: Kiểm tra xem có fetch danh sách nhân viên không
- **Complexity**: Low (1 bảng: profiles)

### 3. Admin Attendance Page
- **File**: `app/admin/attendance/page.tsx`
- **Action**: Kiểm tra xem có danh sách chấm công không
- **Complexity**: Medium

### 4. Schedule Page
- **File**: `app/schedule/schedule-client.tsx`
- **Complexity**: Kiểm tra xem có danh sách gì không

### 5. Settings Page
- **File**: `app/settings/page.tsx`
- **Complexity**: Low (thường không có danh sách dài)

### 6. Reports Page (nếu có)
- **File**: `app/admin/reports/page.tsx`
- **Complexity**: Medium to High

## Checklist cho mỗi trang
- [ ] Xác định trang có danh sách list không?
- [ ] Danh sách có thể >10 items không?
- [ ] Tạo/Update server action với pagination
- [ ] Update client component state
- [ ] Add pagination UI controls
- [ ] Test với data >10 items

## UI Spacing Fix ✅ DONE
- Admin Approvals: Changed `py-4` → `py-6`

