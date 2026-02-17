# 📝 Report Form - Cập nhật v2.0

**Ngày**: 2026-02-07  
**File**: `components/reports/report-form.tsx`

---

## ✨ Những thay đổi chính

### 1. ❌ Xóa Rich Text Editor (TipTap)
**Trước**:
- Sử dụng TipTap editor với toolbar (Bold, Italic, List, Link)
- Phức tạp, không cần thiết cho report đơn giản

**Sau**:
- ✅ Plain `<Textarea>` component
- ✅ Đơn giản, dễ sử dụng
- ✅ Không còn toolbar định dạng

---

### 2. ✅ Placeholder động theo loại báo cáo

**Placeholder thay đổi theo tab**:

| Loại báo cáo | Placeholder Nội dung | Placeholder Kế hoạch |
|--------------|---------------------|---------------------|
| **Hằng ngày** | "Hôm nay bạn đã làm được những gì?" | "Ngày mai bạn dự định làm gì?" |
| **Hằng tuần** | "Tuần này bạn đã hoàn thành những gì?" | "Tuần tới bạn sẽ tập trung vào gì?" |
| **Hằng tháng** | "Tháng này bạn đã đạt được những gì?" | "Tháng tới bạn có kế hoạch gì?" |
| **Báo cáo bù** | "Mô tả công việc bạn đã làm trong thời gian bù" | "Kế hoạch tiếp theo sau khi bù?" |

**Code**:
```typescript
const PLACEHOLDERS = {
    daily: {
        content: 'Hôm nay bạn đã làm được những gì?...',
        nextPlan: 'Ngày mai bạn dự định làm gì?...'
    },
    // ... weekly, monthly, makeup
}

const currentPlaceholder = PLACEHOLDERS[reportType]
```

---

### 3. ✅ Validation bắt buộc

**Các trường bắt buộc** (có dấu `*` đỏ):
- ✅ **Nội dung báo cáo**: Không được để trống
- ✅ **Kế hoạch kế tiếp**: Không được để trống
- ✅ **Báo cáo tới**: Phải chọn ít nhất 1 người

**Error messages**:
```typescript
if (!content.trim()) {
    toast.error('Vui lòng nhập nội dung báo cáo')
    return
}

if (!nextPlan.trim()) {
    toast.error('Vui lòng nhập kế hoạch kế tiếp')
    return
}

if (selectedManagers.length === 0) {
    toast.error('Vui lòng chọn ít nhất một người nhận báo cáo')
    return
}
```

---

### 4. ✅ Chọn người nhận báo cáo (Multi-select Managers)

**Tính năng mới**:
- Load danh sách quản lý từ database (role: admin/manager)
- Cho phép chọn **1 hoặc nhiều người**
- Hiển thị checkbox với thông tin:
  - Tên đầy đủ
  - Chức danh hoặc email
- UI đẹp với highlight khi được chọn

**Code**:
```typescript
// Load managers
useEffect(() => {
    const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, job_title, roles(name)')
        .order('full_name')
    
    // Filter managers/admins
    const managersList = data.filter(profile => {
        const roleName = profile.roles?.name?.toLowerCase()
        return roleName === 'admin' || roleName === 'manager'
    })
    
    setManagers(managersList)
}, [])

// Toggle selection
const toggleManager = (managerId: string) => {
    setSelectedManagers(prev => 
        prev.includes(managerId) 
            ? prev.filter(id => id !== managerId)
            : [...prev, managerId]
    )
}
```

**UI**:
```tsx
<label className={cn(
    "flex items-center gap-3 p-3 rounded-lg cursor-pointer",
    selectedManagers.includes(manager.id)
        ? "bg-cyan-500/10 border border-cyan-500/30"
        : "bg-slate-800/30 border border-slate-700"
)}>
    <input type="checkbox" ... />
    <div>
        <p>{manager.full_name}</p>
        <p className="text-xs">{manager.job_title}</p>
    </div>
</label>
```

---

## 📊 So sánh Before/After

| Feature | Before | After |
|---------|--------|-------|
| **Editor** | TipTap Rich Text | Plain Textarea ✅ |
| **Toolbar** | Bold, Italic, List, Link | Không có ✅ |
| **Placeholder** | Static | Dynamic theo loại báo cáo ✅ |
| **Validation** | Không bắt buộc | Bắt buộc nội dung + kế hoạch + người nhận ✅ |
| **Người nhận** | Không có | Multi-select managers ✅ |
| **Required fields** | Không rõ ràng | Có dấu `*` đỏ ✅ |

---

## 🎯 User Experience Improvements

1. **Đơn giản hơn**: Không còn toolbar phức tạp
2. **Rõ ràng hơn**: Placeholder gợi ý cụ thể theo từng loại báo cáo
3. **An toàn hơn**: Validation đảm bảo không gửi báo cáo thiếu thông tin
4. **Linh hoạt hơn**: Chọn được nhiều người nhận
5. **Trực quan hơn**: Dấu `*` đỏ cho trường bắt buộc

---

## 🔧 Technical Details

### Dependencies không còn cần:
- ❌ `@tiptap/react`
- ❌ `@tiptap/starter-kit`
- ❌ Icons: `Bold`, `Italic`, `List` (từ lucide-react)

### Dependencies mới:
- ✅ `UserCheck` icon (từ lucide-react)
- ✅ `createClient` (từ @/utils/supabase/client)

### State mới:
```typescript
const [content, setContent] = useState('') // Thay vì editor
const [selectedManagers, setSelectedManagers] = useState<string[]>([])
const [managers, setManagers] = useState<Manager[]>([])
```

---

## 📝 API Changes

**Form data gửi đi**:
```typescript
formData.append('content', content) // Plain text thay vì HTML
formData.append('next_plan', nextPlan)
formData.append('recipients', JSON.stringify(selectedManagers)) // NEW!
```

---

## ✅ Testing Checklist

- [ ] Placeholder thay đổi khi chuyển tab (daily/weekly/monthly/makeup)
- [ ] Validation hiển thị lỗi khi thiếu nội dung
- [ ] Validation hiển thị lỗi khi thiếu kế hoạch
- [ ] Validation hiển thị lỗi khi chưa chọn người nhận
- [ ] Danh sách managers load đúng
- [ ] Chọn/bỏ chọn managers hoạt động
- [ ] Hiển thị số lượng người đã chọn
- [ ] Upload file vẫn hoạt động bình thường
- [ ] Submit form thành công

---

**Developed by**: Tiger 🐯  
**Version**: 2.0.0
