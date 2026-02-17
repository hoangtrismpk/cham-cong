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

## [2026-02-14 09:50] - Runtime Error: Timeout (Next.js/Turbopack - Phase 1)

- **Type**: Runtime / Unhandled Rejection
- **Severity**: High
- **File**: Multiple (Context Providers & Hooks)
- **Agent**: Cham-Cong
- **Root Cause**: Unhandled Promise rejections in `useEffect` async functions (mostly in Notification and FCM setup) caused the Next.js dev overlay to hang (Timeout) on Windows.
- **Error Message**: 
  ```
  Runtime Error: Timeout
  Call Stack: onUnhandledRejection (use-error-handler.ts)
  ```
- **Fix Applied**: Wrapped all top-level async setup functions in `useEffect` with `try-catch` blocks in `notification-context.tsx`, `use-local-notifications.ts`, `fcm-manager.tsx`, and `pwa-handler.tsx`.
- **Prevention**: Always wrap async calls inside `useEffect` with `try-catch` or add a `.catch()` handler to the top-level promise call.
- **Status**: Fixed

---

## [2026-02-14 16:20] - Runtime Error: Timeout (Next.js/Turbopack - Phase 2)

- **Type**: Unhandled Promise Rejection (Background Polling)
- **Severity**: Medium
- **File**: `contexts/notification-context.tsx`, `app/actions/notifications.ts`
- **Agent**: Cham-Cong
- **Root Cause**: The polling mechanism (`setInterval`) in `NotificationContext` called `fetchNotifications()`. `fetchNotifications` in turn called the server action `getNotifications`. `getNotifications` did not catch errors internally, so network/timeout errors propagated as rejected Promises. Since `setInterval` executes asynchronously, these rejections were unhandled by the React lifecycle.
- **Error Message**: 
  ```
  🚨 UNHANDLED REJECTION CAUGHT: "Timeout"
  ```
- **Fix Applied**: 
  1. Added `try-catch` to `getNotifications` inside `app/actions/notifications.ts` to ensure it always returns a safe object.
  2. Wrapped `fetchNotifications` body in `try-catch` inside `contexts/notification-context.tsx` to handle any errors safely.
  3. Wrapped async callbacks in `use-local-notifications.ts` (setTimeout) with global `try-catch` to prevent detailed crashes.
- **Prevention**: When using `setInterval` or `setTimeout` with `async` functions, ALWAYS ensure the async function handles its own errors (wrap with `.catch()` or `try-catch`), as caller context is lost.
- **Status**: Fixed

---
