# 🌐 I18N Development Protocol

> **CRITICAL RULE**: Mọi tính năng mới PHẢI có cả 2 ngôn ngữ (VI/EN) ngay từ đầu.

---

## 📋 Checklist cho mỗi tính năng mới

Khi thêm bất kỳ text nào hiển thị cho người dùng, PHẢI làm theo các bước sau:

### ✅ Bước 1: Thêm vào `locales/vi.ts`
```typescript
export const vi = {
  // ... existing
  newFeature: {
    title: 'Tiêu đề tiếng Việt',
    description: 'Mô tả tiếng Việt',
  }
}
```

### ✅ Bước 2: Thêm vào `locales/en.ts`
```typescript
export const en: Translations = {
  // ... existing
  newFeature: {
    title: 'English Title',
    description: 'English Description',
  }
}
```

### ✅ Bước 3: Sử dụng trong Component

**Client Component:**
```tsx
'use client'
import { useI18n } from '@/contexts/i18n-context'

export function MyComponent() {
  const { t } = useI18n()
  return <h1>{t.newFeature.title}</h1>
}
```

**Server Component:**
```tsx
import { getServerTranslations } from '@/lib/i18n-server'

export default async function MyPage() {
  const { t } = await getServerTranslations()
  return <h1>{t.newFeature.title}</h1>
}
```

---

## ⚠️ KHÔNG BAO GIỜ

1. ❌ Hardcode text trực tiếp: `<h1>Dashboard</h1>`
2. ❌ Chỉ thêm 1 ngôn ngữ rồi quên ngôn ngữ kia
3. ❌ Dùng text tiếng Anh trong code rồi dịch sau

---

## ✅ LUÔN LUÔN

1. ✅ Thêm text vào cả 2 file `vi.ts` và `en.ts`
2. ✅ Sử dụng `t.*` để lấy text
3. ✅ Test cả 2 ngôn ngữ trước khi commit

---

## 🎯 Quy ước đặt tên key

```typescript
{
  common: {},        // Các từ dùng chung (Save, Cancel, Delete...)
  nav: {},           // Navigation items
  dashboard: {},     // Dashboard specific
  admin: {},         // Admin specific
  time: {},          // Time-related (days, months...)
  messages: {},      // Success/Error messages
  [feature]: {}      // Tính năng cụ thể
}
```

---

## 🔍 Kiểm tra trước khi commit

- [ ] Đã thêm text vào `vi.ts`?
- [ ] Đã thêm text vào `en.ts`?
- [ ] Đã test chuyển đổi ngôn ngữ?
- [ ] TypeScript không báo lỗi?

---

**Nhớ**: Việc làm 2 ngôn ngữ ngay từ đầu sẽ dễ hơn rất nhiều so với việc phải quay lại dịch sau!
