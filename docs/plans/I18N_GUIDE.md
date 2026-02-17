# 🌐 Hướng dẫn sử dụng Hệ thống Đa ngôn ngữ (i18n)

## 📋 Tổng quan

Hệ thống đa ngôn ngữ đã được triển khai với:
- ✅ Hỗ trợ Tiếng Việt (vi) và English (en)
- ✅ Lưu trữ ngôn ngữ trong Cookie (persistent)
- ✅ Hoạt động với cả Client và Server Components
- ✅ Không ảnh hưởng đến logic hiện tại

---

## 🎯 Cách sử dụng

### 1. Trong Client Components

```tsx
'use client'

import { useI18n } from '@/contexts/i18n-context'

export function MyComponent() {
  const { t, locale, setLocale } = useI18n()

  return (
    <div>
      <h1>{t.dashboard.weeklyProgress}</h1>
      <p>{t.messages.checkInSuccess}</p>
      
      {/* Chuyển đổi ngôn ngữ */}
      <button onClick={() => setLocale('vi')}>Tiếng Việt</button>
      <button onClick={() => setLocale('en')}>English</button>
    </div>
  )
}
```

### 2. Trong Server Components

```tsx
import { getServerTranslations } from '@/lib/i18n-server'

export default async function MyPage() {
  const { t, locale } = await getServerTranslations()

  return (
    <div>
      <h1>{t.dashboard.weeklyProgress}</h1>
      <p>{t.messages.checkInSuccess}</p>
    </div>
  )
}
```

### 3. Trong Server Actions

```tsx
'use server'

import { cookies } from 'next/headers'
import { locales, Locale } from '@/locales'

export async function myAction() {
  const cookieStore = await cookies()
  const locale = (cookieStore.get('locale')?.value as Locale) || 'vi'
  const t = locales[locale]

  // Sử dụng t để trả về message đúng ngôn ngữ
  return { error: t.messages.unauthorized }
}
```

---

## 📁 Cấu trúc File

```
locales/
  ├── vi.ts          # Bản dịch Tiếng Việt
  ├── en.ts          # Bản dịch English
  └── index.ts       # Export tổng hợp

contexts/
  └── i18n-context.tsx   # Context Provider cho Client

lib/
  └── i18n-server.ts     # Helper cho Server Components

components/
  └── language-switcher.tsx  # Nút chuyển đổi ngôn ngữ
```

---

## 🔧 Thêm bản dịch mới

### Bước 1: Thêm vào `locales/vi.ts`

```typescript
export const vi = {
  // ... existing translations
  myNewSection: {
    title: 'Tiêu đề mới',
    description: 'Mô tả mới',
  }
}
```

### Bước 2: Thêm vào `locales/en.ts`

```typescript
export const en: Translations = {
  // ... existing translations
  myNewSection: {
    title: 'New Title',
    description: 'New Description',
  }
}
```

### Bước 3: Sử dụng

```tsx
const { t } = useI18n()
console.log(t.myNewSection.title)
```

---

## ⚠️ Lưu ý quan trọng

1. **Type Safety**: Hệ thống có type checking đầy đủ. Nếu bạn thêm key mới vào `vi.ts`, TypeScript sẽ yêu cầu bạn thêm vào `en.ts`.

2. **Default Language**: Mặc định là Tiếng Việt (vi). Người dùng có thể chuyển sang English bằng nút switcher.

3. **Cookie Persistence**: Ngôn ngữ được lưu trong cookie với thời hạn 1 năm.

4. **Server Components**: Luôn sử dụng `getServerTranslations()` thay vì `useI18n()`.

---

## 🚀 Các bước tiếp theo

Để áp dụng i18n vào toàn bộ ứng dụng:

1. ✅ Đã tích hợp `LanguageSwitcher` vào header
2. ⏳ Cần cập nhật các component hiện có để sử dụng `t.*` thay vì hardcode text
3. ⏳ Cần cập nhật các Server Actions để trả về message đúng ngôn ngữ

---

## 📝 Ví dụ Migration

### Trước khi có i18n:
```tsx
<h3>Weekly Progress</h3>
<p>On track to meet your weekly goal</p>
```

### Sau khi có i18n:
```tsx
const { t } = useI18n()

<h3>{t.dashboard.weeklyProgress}</h3>
<p>{t.dashboard.onTrack}</p>
```

---

**Lưu ý**: Hiện tại hệ thống đã sẵn sàng, nhưng chưa áp dụng vào tất cả các component. 
Bạn có thể từ từ migrate các component theo nhu cầu để tránh gây lỗi.
