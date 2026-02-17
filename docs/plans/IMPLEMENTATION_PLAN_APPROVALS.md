# IMPLEMENTATION PLAN: APPROVAL SYSTEM & NOTIFICATION CENTER

## 🎯 Phase 1: Infrastructure (Backend)

### 1. Database Schema (Supabase)
- [ ] **Run SQL Migration**:
  - Create `notifications` table (id, user_id, title, content, type, is_read, created_at).
  - Add `priority` (text, default 'normal'), `admin_note` (text) to `leave_requests` and `change_requests`.
  - Enable Realtime for `notifications`.

### 2. Server Actions (`app/actions/notification.ts`)
- [ ] `getNotifications(userId)`: Fetch unread notifications.
- [ ] `markAsRead(notificationId)`: Update status.
- [ ] `sendNotification(userId, title, content, type)`: Internal helper for other actions.

### 3. Server Actions (`app/actions/approvals.ts` - Update)
- [ ] Update `createLeaveRequest`: Trigger admin notification.
- [ ] Update `createAttendanceCorrection`: Trigger admin notification.
- [ ] Update `approveRequest` / `rejectRequest`: Trigger user notification.

---

## 🔔 Phase 2: Notification System (Frontend)

### 1. Notification Hook (`hooks/use-notifications.ts`)
- [ ] Implement Supabase Realtime subscription.
- [ ] Auto-toast using `sonner` when new event arrives.
- [ ] State management for unread count.

### 2. Components
- [ ] `components/notification-bell.tsx`: 
  - Bell icon with red dot badge.
  - Dropdown menu with "Mark all read" and list items.
- [ ] `components/dashboard-header.tsx`: Integrate Bell component.
- [ ] `components/dashboard-sidebar.tsx`: Mobile integration (optional).

---

## 📅 Phase 3: User Self-Service (Request Forms)

### 1. Schedule Page (`app/schedule/page.tsx`)
- [ ] Add "New Request" button.
- [ ] **Leave Request Modal**:
  - Select Type (Sick, Vacation, Unpaid).
  - Date Picker (Range or Single).
  - Duration (Full day, Morning, Afternoon).
  - Reason (Textarea).
- [ ] **OT Request Modal**:
  - Date, Start Time, End Time.
  - Reason.
- [ ] **Visual Indicators**:
  - Show "Pending" (Yellow) / "Approved" (Green) status on calendar cells.

### 2. Timesheet Page (`app/timesheets/page.tsx`)
- [ ] Add "Request Correction" action on row hover.
- [ ] **Correction Modal**:
  - Original In/Out vs Corrected In/Out.
  - Reason.

---

## 🛡️ Phase 4: Admin Approval Center (Chronos Design)

### 1. Page (`app/admin/approvals/page.tsx`)
- [ ] **Header**: Stats overview (Total Pending, Urgent, etc.).
- [ ] **Tabs**: Leave Requests | Timesheet Edits | OT Requests.
- [ ] **Filters**: Search by User, Status, Date.
- [ ] **Data Table (Card Style)**:
  - Avatar + Name + Dept.
  - Request Type + Badge (Color coded).
  - Time/Duration details.
  - Priority Badge (Urgent/Normal).
  - Action Buttons (Approve, Reject, View).
- [ ] **Bulk Actions**: "Approve Selected".

### 2. Logic
- [ ] Auto-calculate 'Urgent' if request date is close (< 24h).
- [ ] Auto-calculate 'Past Due' if request date > today.

---

## 📝 Success Criteria
- [ ] User receives Realtime toast when Admin approves.
- [ ] Admin receives Realtime toast when User submits.
- [ ] Calendar reflects correct status colors.
- [ ] Admin UI matches "Chronos" dark theme aesthetics.
