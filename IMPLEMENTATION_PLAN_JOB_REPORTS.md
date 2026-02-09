# IMPLEMENTATION PLAN - JOB REPORTING MODULE

## 🎯 Goal
Implement a comprehensive Job Reporting system allowing employees to submit daily/weekly work reports and administrators to monitor, review, and analyze reporting performance.

## 📦 Phase 1: Database & Backend Foundation
- [ ] **Schema Design**: Create `work_reports` table.
    - `id` (uuid, pk)
    - `user_id` (uuid, fk profiles)
    - `content` (text/html)
    - `report_date` (date)
    - `report_type` (text: daily, weekly, monthly, makeup)
    - `status` (text: pending, reviewed)
    - `attachments` (jsonb)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
- [ ] **Tracking Schema**: Create `report_views` table.
    - `report_id` (uuid, fk work_reports)
    - `viewer_id` (uuid, fk profiles)
    - `viewed_at` (timestamptz)
    - Constraint: Unique pair (report_id, viewer_id)
- [ ] **Storage**: Create `report_attachments` bucket (private, authenticated access).
- [ ] **RLS Policies**: 
    - `work_reports`: Users see own, Admins/Managers see all (or based on team).
    - `report_views`: Admins/Managers insert, Users select.
- [ ] **Server Actions**:
    - `submitReport(formData)`: Handle upload and insert.
    - `getMyReports(page, limit)`: For user history.
    - `markReportAsViewed(reportId)`: For admin tracking.

## 🎨 Phase 2: User Interface (Report Submission)
- [ ] **Layout**: Create `/reports` layout with Main Content + Sidebar History.
- [ ] **Rich Text Editor**: Integrate `Tiptap` or similar for report content.
- [ ] **File Upload**: Drag & drop zone for attachments (using Supabase Storage).
- [ ] **Sidebar History**: Display recent reports list with status.
- [ ] **"Seen By" UI**: Show who viewed the report in the history item or detail view.

## 📊 Phase 3: Admin Dashboard (Management & Analytics)
- [ ] **Stats Cards**:
    - Total Reports (Monthly)
    - Completion Rate (% users reported vs scheduled)
    - On-time Rate
    - Late/Makeup Rate
- [ ] **Chart**: Bar chart showing Daily Reports vs Time.
- [ ] **Report List**:
    - Table with Avatar, Name, Date, Type, Status.
    - Filters: Month, Department, Status.
- [ ] **Backend Logic**: Create `getReportStats(month, year)` to calculate these metrics efficiently.

## 👁️ Phase 4: Admin Review Detail
- [ ] **Detail Page**: `/admin/reports/[id]`.
- [ ] **View Tracking**: Auto-call `markReportAsViewed` on mount.
- [ ] **Action Buttons** (Mockup for now):
    - [Approve] (Green)
    - [Request Changes] (Yellow)
    - [Comment] (Gray)
- [ ] **Navigation**: Easy next/prev navigation between reports.

## 📝 Phase 5: Notifications & Polish
- [ ] **Notifications**: 
    - Notify Manager on new report.
    - Notify User on report view/review.
- [ ] **UI Polish**: Ensure dark mode / neon style consistency.
