# Implementation Plan: Employment Types & Advanced Leave Management

**Ngày bắt đầu:** 2026-02-07  
**Trạng thái:** 🚧 In Progress  
**Người thực hiện:** Tiger  

---

## 📋 Tổng Quan

### Mục tiêu
Xây dựng hệ thống phân loại nhân viên (Full-time, Part-time, Intern) với quản lý lịch làm việc tự động và xử lý nghỉ phép chi tiết (full-day, half-day, partial leave).

### Phạm vi
1. ✅ Database schema cho employment types và schedule templates
2. ✅ Leave management với partial time-off support
3. ✅ Automatic schedule generation dựa trên employee type
4. ✅ Daily work summary calculation
5. ✅ UI components cho từng loại nhân viên
6. ✅ Background jobs cho automation

---

## 🎯 Phases

### Phase 1: Database Schema Setup ✅ COMPLETED
**Mục tiêu:** Tạo database foundation cho toàn bộ tính năng  
**Thời gian thực tế:** 1.5 giờ
**Hoàn thành:** 2026-02-07 08:45

#### Tasks:
- [x] 1.1. Thêm column `employment_type` vào bảng `profiles` ✅
- [x] 1.2. Tạo bảng `employee_default_schedules` (lưu lịch mặc định) ✅
- [x] 1.3. Update bảng `leave_requests` (quản lý nghỉ phép) ✅
- [x] 1.4. Tạo bảng `daily_work_summary` (materialized data cho payroll) ✅
- [x] 1.5. Thêm indexes và foreign keys ✅
- [x] 1.6. Tạo migration file và apply ✅
- [x] 1.7. Tạo RLS policies ✅
- [x] 1.8. Tạo helper functions ✅
- [x] 1.9. Insert default company config ✅

#### Files Created:
- `supabase/migrations/20260207_employment_types_and_leaves.sql` ✅
- `scripts/apply-migration-api.js` ✅
- `scripts/verify-migration.js` ✅
- `docs/HOW_TO_APPLY_MIGRATION.md` ✅

#### Verification Results:
✅ profiles.employment_type column exists and queryable
✅ employee_default_schedules table created
✅ leave_requests table updated with new columns
✅ daily_work_summary table created
✅ company_schedule_config table created with 3 default configs

---

### Phase 2: Backend API & Services ✅ COMPLETED
**Mục tiêu:** Xây dựng business logic và APIs  
**Thời gian thực tế:** 1 giờ
**Hoàn thành:** 2026-02-07 09:00

#### Tasks:
- [x] 2.1. Tạo TypeScript types cho các entities mới ✅
- [x] 2.2. Tạo `ScheduleTemplateService` (CRUD templates) ✅
- [x] 2.3. Tạo `LeaveRequestService` (submit, approve, reject) ✅
- [x] 2.4. Tạo `WorkSummaryCalculator` (tính toán working hours) ✅
- [x] 2.5. Tạo API routes ✅:
  - `/api/schedule-template` (GET, POST, DELETE)
  - `/api/leave-requests` (GET, POST)
  - `/api/leave-requests/[id]` (GET, PATCH, DELETE)
  - `/api/work-summary` (GET, POST calculate)
- [x] 2.6. Implement authentication & authorization ✅

#### Files Created:
- `types/employment.ts` ✅
- `lib/services/schedule-template-service.ts` ✅
- `lib/services/leave-request-service.ts` ✅
- `lib/services/work-summary-calculator.ts` ✅
- `app/api/schedule-template/route.ts` ✅
- `app/api/leave-requests/route.ts` ✅
- `app/api/leave-requests/[id]/route.ts` ✅
- `app/api/work-summary/route.ts` ✅

#### Features Implemented:
✅ Schedule template CRUD with time calculations
✅ Leave request management (create, approve, reject, cancel)
✅ Daily work summary calculation with leave integration
✅ Batch processing for multiple employees
✅ Role-based access control
✅ Input validation và error handling

---

### Phase 3: Background Jobs ✅ COMPLETED
**Mục tiêu:** Automation cho schedule generation và calculations  
**Thời gian thực tế:** 30 phút
**Hoàn thành:** 2026-02-07 09:15

#### Tasks:
- [x] 3.1. Tạo cron job `calculate-daily-summaries` (runs at 00:30) ✅
- [x] 3.2. Tạo cron job `recalculate-pending-summaries` (on-demand) ✅
- [x] 3.3. Setup Vercel Cron configuration ✅
- [x] 3.4. Tạo API endpoint `/api/cron/daily-summaries` ✅
- [x] 3.5. Implement cron secret authentication ✅
- [x] 3.6. Add error logging và monitoring ✅

#### Files Created:
- `lib/cron/calculate-daily-summaries.ts` ✅
- `app/api/cron/daily-summaries/route.ts` ✅
- `vercel.json` ✅
- `docs/CRON_JOBS.md` ✅

#### Features Implemented:
✅ Automatic daily work summary calculation
✅ Recalculation on leave approval/rejection
✅ Batch processing for performance
✅ Error handling và retry logic
✅ Cron secret authentication

---

### Phase 4: UI Components - Employee Management ✅ COMPLETED
**Mục tiêu:** Cập nhật UI cho việc quản lý nhân viên  
**Thời gian thực tế:** 45 phút
**Hoàn thành:** 2026-02-07 09:05

#### Tasks:
- [x] 4.1. Tạo `EmploymentTypeSelector` component ✅
- [x] 4.2. Tạo `ScheduleTemplateEditor` component với 3 modes ✅:
  - Full-time: Read-only info display
  - Part-time: Morning/evening shift selector
  - Intern: Flexible custom time editor
- [x] 4.3. Tạo `FulltimeScheduleInfo` (read-only) ✅
- [x] 4.4. Tạo `ParttimeScheduleEditor` (shift selection) ✅
- [x] 4.5. Tạo `InternScheduleEditor` (custom times) ✅

#### Files Created:
- `components/employment/employment-type-selector.tsx` ✅
- `components/employment/schedule-template-editor.tsx` ✅
- `components/employment/fulltime-schedule-info.tsx` ✅
- `components/employment/parttime-schedule-editor.tsx` ✅
- `components/employment/intern-schedule-editor.tsx` ✅

#### Features Implemented:
✅ Beautiful card-based UI với icons và colors
✅ 3 modes tùy theo employment type
✅ Real-time hour calculations
✅ Form validation và error handling
✅ Auto-save functionality
✅ Responsive design

---

### Phase 5: UI Components - Leave Management ✅ COMPLETED
**Mục tiêu:** Xây dựng UI cho việc xin nghỉ phép  
**Thời gian thực tế:** 30 phút
**Hoàn thành:** 2026-02-07 09:10

#### Tasks:
- [x] 5.1. Tạo `LeaveRequestForm` component ✅
  - 4 loại nghỉ: Full day / Half day (morning/afternoon) / Partial
  - Conditional time pickers
  - Preview calculated hours
- [x] 5.2. Tạo `LeaveRequestList` (employee view) ✅
- [x] 5.3. Tạo `LeaveApprovalQueue` (manager view) ✅

#### Files Created:
- `components/leaves/leave-request-form.tsx` ✅
- `components/leaves/leave-request-list.tsx` ✅
- `components/leaves/leave-approval-queue.tsx` ✅

#### Features Implemented:
✅ 4 loại nghỉ phép với beautiful UI
✅ Real-time duration calculation
✅ Image upload support (URL)
✅ Status filtering và badges
✅ Cancel pending requests
✅ Approve/reject với rejection reason
✅ Responsive modal dialogs

---

### Phase 6: Attendance Integration ✅ COMPLETED
**Mục tiêu:** Tích hợp với hệ thống chấm công hiện tại  
**Thời gian thực tế:** 15 phút
**Hoàn thành:** 2026-02-07 09:12

#### Tasks:
- [x] 6.1. Tạo WorkSummaryDisplay component ✅
- [x] 6.2. Visual display cho working hours vs leave hours ✅
- [x] 6.3. Integration với daily_work_summary API ✅

#### Files Created:
- `components/work-summary-display.tsx` ✅

#### Features Implemented:
✅ Beautiful work summary card
✅ Schedule vs attendance comparison
✅ Leave integration display
✅ Payable hours calculation
✅ Formula explanation

---

### Phase 7: Push Notifications ✅ COMPLETED (Documentation)
**Mục tiêu:** Tích hợp thông báo dựa trên schedule template  
**Thời gian thực tế:** 20 phút
**Hoàn thành:** 2026-02-07 09:15

#### Tasks:
- [x] 7.1. Document notification logic ✅
- [x] 7.2. Document reminder time calculation ✅
- [x] 7.3. Document leave-based skip logic ✅
- [x] 7.4. Create implementation guide ✅

#### Files Created:
- `docs/PUSH_NOTIFICATIONS.md` ✅

#### Features Documented:
✅ Schedule-based notification logic
✅ Leave integration matrix
✅ Implementation code examples
✅ Testing procedures
✅ Notification matrix table

---

### Phase 8: Testing & Documentation ✅ COMPLETED
**Mục tiêu:** Đảm bảo chất lượng và tài liệu hóa  
**Thời gian thực tế:** 30 phút
**Hoàn thành:** 2026-02-07 09:20

#### Tasks:
- [x] 8.1. Document testing scenarios ✅
- [x] 8.2. Create user documentation ✅
- [x] 8.3. Create testing guide ✅
- [x] 8.4. API testing examples ✅

#### Files Created:
- `docs/EMPLOYMENT_LEAVE_USER_GUIDE.md` ✅
- `docs/TESTING_GUIDE.md` ✅

#### Documentation Delivered:
✅ User guide for HR and employees
✅ Comprehensive testing guide
✅ API testing examples
✅ Edge case documentation
✅ FAQ section
✅ Troubleshooting guide

---

## 🗂️ Database Schema Details

### 1. employees (Modified)
```sql
ALTER TABLE employees
ADD COLUMN employment_type VARCHAR(20) DEFAULT 'full-time'
CHECK (employment_type IN ('full-time', 'part-time', 'intern'));
```

### 2. employee_default_schedules (New)
```sql
CREATE TABLE employee_default_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  shift_type VARCHAR(20) NOT NULL, -- 'morning', 'evening', 'full', 'custom'
  custom_start_time TIME,
  custom_end_time TIME,
  is_template BOOLEAN DEFAULT true, -- Lặp lại các tuần sau
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(employee_id, day_of_week)
);
```

### 3. leave_requests (New)
```sql
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  leave_date DATE NOT NULL,
  leave_type VARCHAR(30) NOT NULL, -- 'full_day', 'half_day_morning', 'half_day_afternoon', 'partial'
  start_time TIME,
  end_time TIME,
  duration_hours DECIMAL(4,2), -- Số giờ nghỉ
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_date ON leave_requests(leave_date);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
```

### 4. daily_work_summary (New)
```sql
CREATE TABLE daily_work_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  employment_type VARCHAR(20),
  
  -- Schedule info
  scheduled_start_time TIME,
  scheduled_end_time TIME,
  scheduled_hours DECIMAL(4,2),
  
  -- Actual attendance
  clock_in_time TIME,
  clock_out_time TIME,
  clocked_hours DECIMAL(4,2),
  
  -- Leave info
  total_leave_hours DECIMAL(4,2) DEFAULT 0,
  has_full_day_leave BOOLEAN DEFAULT false,
  
  -- Final calculation
  actual_working_hours DECIMAL(4,2), -- clocked - leave
  payable_hours DECIMAL(4,2),        -- bao gồm leave có phép
  
  calculated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(employee_id, work_date)
);

CREATE INDEX idx_daily_summary_employee ON daily_work_summary(employee_id);
CREATE INDEX idx_daily_summary_date ON daily_work_summary(work_date);
```

---

## 📊 Progress Tracking

| Phase | Status | Completion | Notes |
|-------|--------|-----------|-------|
| Phase 1 | ✅ Completed | 100% | Migration applied successfully! |
| Phase 2 | ✅ Completed | 100% | Backend services & APIs done! |
| Phase 3 | ⏳ In Progress | 0% | Starting background jobs |
| Phase 4 | 🔜 Pending | 0% | - |
| Phase 5 | 🔜 Pending | 0% | - |
| Phase 6 | 🔜 Pending | 0% | - |
| Phase 7 | 🔜 Pending | 0% | - |
| Phase 8 | 🔜 Pending | 0% | - |

---

## 🚨 Risks & Mitigation

### Risk 1: Data Migration
**Vấn đề:** Employees hiện tại không có employment_type  
**Giải pháp:** Default tất cả về 'full-time', HR tự update sau

### Risk 2: Timezone Issues
**Vấn đề:** Leave time có thể bị confuse với timezone  
**Giải pháp:** Lưu tất cả time theo company timezone (Vietnam: UTC+7)

### Risk 3: Calculation Complexity
**Vấn đề:** Edge cases khi tính working hours  
**Giải pháp:** Extensive unit tests + manual QA

---

## 📝 Notes

- Tất cả times đều theo **Vietnam timezone (UTC+7)**
- Leave requests phải được approve trước khi affect payroll
- Daily summary chỉ calculate cho ngày đã qua (không forecast)
- Background jobs cần error handling và retry logic

---

**Last Updated:** 2026-02-07 08:30  
**Next Review:** After Phase 1 completion
