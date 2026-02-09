## [2026-02-06 16:30] - Missing 'use client' in HomeMobileHeader

- **Type**: Runtime
- **Severity**: Critical
- **File**: `components/home-mobile-header.tsx:1`
- **Agent**: Tiger
- **Root Cause**: Accidental removal of 'use client' directive during refactoring of HomeMobileHeader to use MobileHeader component.
- **Error Message**: 
  ```
  Attempted to call useSetting() from the server but useSetting is on the client. It's not possible to invoke a client function from the server...
  ```
- **Fix Applied**: Added 'use client' directive to the top of components/home-mobile-header.tsx.
- **Prevention**: Double-check preservation of directives effectively when replacing large blocks of code at the beginning of files.
- **Status**: Fixed

---
