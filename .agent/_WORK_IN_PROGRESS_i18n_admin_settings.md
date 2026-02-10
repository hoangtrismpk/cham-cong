# Admin Settings i18n - Progress Tracker

## ✅ Completed

### 1. Translation Files
- ✅ Added `adminSettings` object to `locales/vi.ts`
- ✅ Added `adminSettings` object to `locales/en.ts`

### 2. Translation Coverage
- ✅ Layout & Navigation
- ✅ General Settings (Company, Working Hours, Office Location, WiFi Rules, Off Days)
- ✅ Security Settings (reCAPTCHA, 2FA, Advanced Security)
- ✅ Role Management (Create, Delete, Permissions)
- ✅ Integrations (WordPress)
- ✅ Coming Soon Pages (Notifications, Feature Toggles)

## 📋 Next Steps - Apply translations to components

### Phase 1: Layout & Navigation
- [ ] `app/admin/settings/layout.tsx` - Navigation tabs

### Phase 2: General Settings
- [ ] `app/admin/settings/general/page.tsx` - All sections

### Phase 3: Security Settings
- [ ] `app/admin/settings/security/page.tsx` - All cards

### Phase 4: Role Management
- [ ] `app/admin/settings/roles/page.tsx` - Header
- [ ] `app/admin/settings/roles/role-manager.tsx` - Role selector, permissions, create dialog

### Phase 5: Integrations
- [ ] `app/admin/settings/integrations/page.tsx` - Form and help

### Phase 6: Coming Soon
- [ ] `app/admin/settings/notifications/page.tsx`
- [ ] `app/admin/settings/feature-toggles/page.tsx`

## 🔑 Translation Keys Structure

```typescript
adminSettings: {
  // Top level
  title, general, security, roles, integrations, notifications, featureToggles, comingSoon
  
  // General Settings
  generalSettings: {
    title, description,
    company: { title, description, name, website, address, ... },
    workingHours: { title, description, startTime, endTime, ... },
    officeLocation: { title, description, latitude, longitude, ... },
    wifiRules: { title, description, companyWifiIp, ... },
    offDays: { title, description, monday, tuesday, ... },
    actions: { save, saving, saveSuccess, saveError, loadError }
  },
  
  // Security Settings
  securitySettings: {
    title, description,
    recaptcha: { title, description, enabled, disabled, toggle, siteKey, secretKey, ... },
    twoFactor: { title, toggle, toggleDescription },
    advancedSecurity: { title, accountLockout, accountLockoutDescription },
    actions: { saveChanges, testing, ... }
  },
  
  // Role Management
  roleSettings: {
    title, description, roles, selectRole, permissions, fullAccess, ...
    createRole: { button, title, modalDescription, displayName, roleId, ... },
    deleteRole: { confirm, success },
    actions: { save, saving, saveSuccess, ... }
  },
  
  // Integrations
  integrations: {
    title, description,
    status: { connected, failed, pending, lastTested },
    form: { siteUrl, username, appPassword, ... },
    actions: { test, save, delete, testSuccess, ... },
    security: { title, note1, note2, note3 },
    help: { title, step1, step2, step3, step4, step5 }
  },
  
  // Coming Soon
  notificationsComingSoon: { title, description, badge },
  featureTogglesComingSoon: { title, description, badge }
}
```

## 📝 Usage Example

```typescript
import { useI18n } from '@/contexts/i18n-context'

function MyComponent() {
  const { t } = useI18n()
  
  return (
    <h1>{t.adminSettings.generalSettings.title}</h1>
  )
}
```

## ⚠️ Known Issues

- IDE may show duplicate property lint errors temporarily (cache issue)
- Both vi.ts and en.ts have been updated correctly
- All components still need to be updated to use these translations

## 📊 Statistics

- Total translation keys added: ~240+
- Files modified: 2 (vi.ts, en.ts)
- Components to update: 7
- Estimated time to apply: 2-3 hours
