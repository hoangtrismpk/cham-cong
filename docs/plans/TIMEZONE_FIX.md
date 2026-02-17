# 🕐 Timezone Fix - Vietnam (UTC+7)

**Ngày**: 2026-02-07

---

## 🔍 Vấn đề:

Thời gian hiển thị không đúng múi giờ VN (UTC+7)

---

## 🎯 Giải pháp:

### **Cách hoạt động đúng**:

1. **Database**: Lưu UTC (chuẩn quốc tế)
2. **Browser**: Tự động convert sang local timezone
3. **Display**: Hiển thị theo timezone của user

### **Code hiện tại**:

```typescript
// ✅ ĐÚNG - date-fns tự động dùng local timezone
{format(new Date(report.created_at), 'HH:mm - dd/MM/yyyy', { locale: vi })}
```

**Lý do đúng**:
- `new Date(report.created_at)` tạo Date object
- Browser tự convert từ UTC sang local time
- `format()` hiển thị theo local time
- Nếu user ở VN → Hiển thị UTC+7 ✅

---

## 🧪 Test:

### **Kiểm tra múi giờ browser**:

Mở Console (F12) và chạy:

```javascript
// Check browser timezone
console.log(Intl.DateTimeFormat().resolvedOptions().timeZone)
// Kết quả mong đợi: "Asia/Ho_Chi_Minh" hoặc "Asia/Bangkok"

// Check offset
console.log(new Date().getTimezoneOffset())
// Kết quả mong đợi: -420 (tức là UTC+7)

// Test format
const testDate = new Date('2026-02-07T09:30:00Z') // 9:30 UTC
console.log(testDate.toLocaleString('vi-VN'))
// Kết quả mong đợi: "07/02/2026, 16:30:00" (9:30 + 7 = 16:30)
```

---

## ⚠️ Nếu vẫn sai:

### **Nguyên nhân có thể**:

1. **Browser timezone sai**:
   - Windows: Settings → Time & Language → Set time zone to "Bangkok, Hanoi, Jakarta"
   - Hoặc: "(UTC+07:00) Bangkok, Hanoi, Jakarta"

2. **Database lưu sai**:
   - Check: `SELECT created_at FROM work_reports LIMIT 1;`
   - Phải có dạng: `2026-02-07 09:30:00+00` (UTC)
   - Không phải: `2026-02-07 16:30:00` (local time)

3. **Server timezone sai**:
   - Check Supabase project settings
   - Timezone should be UTC (default)

---

## 🔧 Fix nếu cần:

### **Option 1: Force Vietnam timezone (không khuyến nghị)**

```typescript
import { formatInTimeZone } from 'date-fns-tz'

// Thay vì:
{format(new Date(report.created_at), 'HH:mm - dd/MM/yyyy')}

// Dùng:
{formatInTimeZone(
    new Date(report.created_at), 
    'Asia/Ho_Chi_Minh', 
    'HH:mm - dd/MM/yyyy'
)}
```

**Cần install**:
```bash
npm install date-fns-tz
```

### **Option 2: Manual offset (không khuyến nghị)**

```typescript
function toVietnamTime(utcDate: string) {
    const date = new Date(utcDate)
    // Add 7 hours
    date.setHours(date.getHours() + 7)
    return date
}
```

---

## ✅ Khuyến nghị:

**KHÔNG CẦN SỬA GÌ** nếu:
- Browser timezone đã set đúng VN
- Database lưu UTC
- Code hiện tại dùng `new Date()` + `format()`

→ Mọi thứ sẽ tự động đúng! ✅

---

## 📝 Checklist:

- [ ] Check browser timezone: `Intl.DateTimeFormat().resolvedOptions().timeZone`
- [ ] Check offset: `new Date().getTimezoneOffset()` = -420
- [ ] Test với UTC date: `new Date('2026-02-07T09:30:00Z')`
- [ ] Xem có hiển thị 16:30 không (9:30 + 7)
- [ ] Nếu đúng → Không cần sửa gì!
- [ ] Nếu sai → Check Windows timezone settings

---

**Created by**: Tiger 🐯  
**Date**: 2026-02-07
