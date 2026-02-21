# 🧪 Employment Types & Leave Management - Testing Guide

**Version:** 1.0  
**Last Updated:** 2026-02-07

---

## 📋 Test Scenarios

### Scenario 1: Full-time Employee Workflow

**Setup:**
1. Create employee with `employment_type = 'full-time'`
2. Verify schedule auto-generated (M-F, 08:30-18:00)

**Test Cases:**

**TC1.1: Normal Working Day**
```
Given: Employee has no leave requests
When: Employee clocks in at 08:30, out at 18:00
Then:
  - clocked_hours = 8.0 (với 1h break)
  - payable_hours = 8.0
  - actual_working_hours = 8.0
```

**TC1.2: Full Day Leave**
```
Given: Employee has approved full_day leave
When: Work summary is calculated
Then:
  - clock_in_time = NULL
  - clock_out_time = NULL
  - total_leave_hours = 8.0
  - payable_hours = 8.0 (tính từ scheduled)
  - actual_working_hours = 0
```

**TC1.3: Half Day Morning Leave**
```
Given: Employee has approved half_day_morning leave
When: Employee clocks in at 13:30, out at 18:00
Then:
  - clocked_hours = 4.5
  - total_leave_hours = 4.0
  - payable_hours = 8.5 (4.5 worked + 4 leave)
  - actual_working_hours = 0.5 (4.5 - 4)
```

---

### Scenario 2: Part-time Employee Workflow

**Setup:**
1. Create employee with `employment_type = 'part-time'`
2. Set schedule: Mon/Wed/Fri morning shift

**Test Cases:**

**TC2.1: Morning Shift Day**
```
Given: Monday, schedule = morning shift (08:30-12:30)
When: Employee clocks in 08:30, out 12:30
Then:
  - scheduled_hours = 4.0
  - clocked_hours = 4.0
  - payable_hours = 4.0
```

**TC2.2: No Schedule Day**
```
Given: Tuesday (no schedule set)
When: Work summary calculated
Then:
  - scheduled_hours = 0
  - No notification sent
```

**TC2.3: Partial Leave on Shift Day**
```
Given: Monday morning shift, partial leave 09:00-10:00
When: Employee works 08:30-12:30
Then:
  - clocked_hours = 4.0
  - total_leave_hours = 1.0
  - actual_working_hours = 3.0
  - payable_hours = 4.0 (3 worked + 1 approved leave)
```

---

### Scenario 3: Intern Workflow

**Setup:**
1. Create employee with `employment_type = 'intern'`
2. Set custom schedule: Mon 09:00-14:00, Wed 10:00-16:00

**Test Cases:**

**TC3.1: Custom Schedule Day**
```
Given: Monday, schedule 09:00-14:00
When: Employee clocks 09:00 to 14:00
Then:
  - scheduled_hours = 5.0
  - clocked_hours = 5.0
  - payable_hours = 5.0
```

**TC3.2: Flexible Schedule Change**
```
Given: Employee updates Wed to 08:00-12:00
When: Work summary calculated for next Wednesday
Then:
  - New schedule reflects: scheduled_hours = 4.0
```

---

### Scenario 4: Leave Request Lifecycle

**TC4.1: Submit Leave Request**
```
Given: Employee logged in
When: Submit leave request for future date
Then:
  - Request created with status = 'pending'
  - Appears in manager approval queue
```

**TC4.2: Approve Leave**
```
Given: Manager views pending leave
When: Manager clicks Approve
Then:
  - Status changes to 'approved'
  - approved_by and approved_at are set
  - daily_work_summary marked for recalculation
```

**TC4.3: Reject Leave with Reason**
```
Given: Manager reviews leave request
When: Manager rejects with reason "Insufficient staff"
Then:
  - Status = 'rejected'
  - rejection_reason saved
  - Employee can see reason in UI
```

**TC4.4: Cancel Pending Leave**
```
Given: Employee has pending leave request
When: Employee clicks Cancel
Then:
  - Status changes to 'cancelled'
  - Request disappears from approval queue
```

**TC4.5: Cannot Cancel Approved Leave**
```
Given: Leave is already approved
When: Employee tries to cancel via DELETE API
Then:
  - API returns error
  - Leave remains approved
```

---

### Scenario 5: Work Summary Calculation

**TC5.1: Basic Calculation**
```
Given:
  - Scheduled: 08:30-18:00 (8h)
  - Clocked: 08:30-18:00 (8h)
  - No leave
When: Daily summary calculated
Then:
  - actual_working_hours = 8.0
  - payable_hours = 8.0
```

**TC5.2: Late Clock In**
```
Given:
  - Scheduled: 08:30-18:00 (8h)
  - Clocked: 09:00-18:00 (7h)
  - No leave
Then:
  - clocked_hours = 7.0
  - payable_hours = 7.0
  - actual_working_hours = 7.0
```

**TC5.3: Overtime**
```
Given:
  - Scheduled: 08:30-18:00 (8h)
  - Clocked: 08:30-20:00 (10h)
Then:
  - clocked_hours = 10.0
  - payable_hours = 10.0
```

**TC5.4: Multiple Partial Leaves**
```
Given:
  - Clocked: 08:30-18:00 (8h)
  - Leave 1: 10:00-11:00 (1h)
  - Leave 2: 15:00-16:00 (1h)
Then:
  - total_leave_hours = 2.0
  - actual_working_hours = 6.0 (8 - 2)
  - payable_hours = 8.0
```

---

## 🔧 API Testing

### Test API Endpoints

**Setup:**
```bash
export API_URL="http://localhost:3000"
export AUTH_TOKEN="your-auth-token"
```

### 1. Schedule Template API

**Create Schedule:**
```bash
curl -X POST "$API_URL/api/schedule-template" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "xxx",
    "schedules": [
      {
        "day_of_week": 1,
        "shift_type": "morning"
      },
      {
        "day_of_week": 3,
        "shift_type": "evening"
      }
    ]
  }'
```

**Expected:** 201 Created

**Get Schedule:**
```bash
curl "$API_URL/api/schedule-template?employee_id=xxx" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Expected:** 200 OK with schedule array

---

### 2. Leave Request API

**Create Leave:**
```bash
curl -X POST "$API_URL/api/leave-requests" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "xxx",
    "leave_date": "2026-02-10",
    "leave_type": "full_day",
    "reason": "Ốm đau"
  }'
```

**Expected:** 201 Created

**Approve Leave:**
```bash
curl -X PATCH "$API_URL/api/leave-requests/{id}" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve"
  }'
```

**Expected:** 200 OK

**Reject Leave:**
```bash
curl -X PATCH "$API_URL/api/leave-requests/{id}" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "reject",
    "rejection_reason": "Không đủ nhân sự"
  }'
```

**Expected:** 200 OK

---

### 3. Work Summary API

**Get Summary:**
```bash
curl "$API_URL/api/work-summary?employee_id=xxx&date=2026-02-07" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Expected:** 200 OK with DailyWorkSummary object

**Trigger Calculation:**
```bash
curl -X POST "$API_URL/api/work-summary" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "xxx",
    "date": "2026-02-07"
  }'
```

**Expected:** 200 OK

---

### 4. Cron Job API

**Trigger Daily Summary:**
```bash
curl -X POST "$API_URL/api/cron/daily-summaries" \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Expected:** 200 OK with count

---

## 🧪 Database Testing

### Verify Data Integrity

**Check RLS Policies:**
```sql
-- Employee can only see own schedules
SET ROLE authenticated;
SET request.jwt.claim.sub = 'employee-uuid';

SELECT * FROM employee_default_schedules;
-- Should only return employee's own schedules
```

**Check Leave Duration Calculation:**
```sql
-- Verify helper function
SELECT calculate_leave_duration('full_day', NULL, NULL);
-- Expected: 8.0

SELECT calculate_leave_duration('partial', '09:00:00', '11:00:00');
-- Expected: 2.0
```

**Check Cascade Deletes:**
```sql
DELETE FROM profiles WHERE id = 'test-employee-id';
-- Should cascade delete:
-- - employee_default_schedules
-- - leave_requests
-- - daily_work_summary
```

---

## 🎭 UI Testing

### Manual UI Tests

**Employment Type Selector:**
1. ✅ All 3 types display with icons
2. ✅ Click selects type
3. ✅ Visual feedback on selection
4. ✅ Disabled state works

**Schedule Template Editor:**
1. ✅ Switches mode based on employment type
2. ✅ Full-time shows read-only info
3. ✅ Part-time shows shift selectors
4. ✅ Intern shows time inputs
5. ✅ Hours calculation updates real-time
6. ✅ Save button only enabled when changes

**Leave Request Form:**
1. ✅ All 4 leave types selectable
2. ✅ Partial leave shows time pickers
3. ✅ Duration calculates correctly
4. ✅ Cannot select past dates
5. ✅ Form validation works
6. ✅ Submit creates request

**Leave Approval Queue:**
1. ✅ Shows only pending requests
2. ✅ Approve button works
3. ✅ Reject modal shows
4. ✅ Rejection reason required
5. ✅ List updates after action

---

## 🐛 Edge Cases

### Edge Case 1: Clock In/Out on Leave Day
```
Given: Full day leave approved
When: Employee still clocks in/out
Then: System should use leave hours, not clocked hours
```

### Edge Case 2: Overlapping Leaves
```
Given: Employee submits 2 leave requests for same date
When: Both approved
Then: total_leave_hours should sum both
```

### Edge Case 3: Timezone Edge
```
Given: Clock out after midnight (next day)
When: Calculating hours
Then: Should handle cross-day properly
```

### Edge Case 4: Weekend Leave Request
```
Given: Employee submits leave for Saturday
When: No schedule on Saturday
Then: Should calculate based on employment type default
```

---

## ✅ Acceptance Criteria

### Functional Requirements

- [x] Employees can be classified as full-time, part-time, or intern
- [x] Schedule templates auto-generate based on employment type
- [x] Employees can submit 4 types of leave requests
- [x] Managers can approve/reject leave requests
- [x] Daily work summary calculates automatically
- [x] Payable hours include approved leave time

### Performance Requirements

- [x] API response time < 500ms
- [x] Daily summary cron completes in < 10s for 100 employees
- [x] UI renders in < 2s

### Security Requirements

- [x] RLS policies enforce data access
- [x] Only managers can approve leaves
- [x] Employees can only view own data

---

## 📊 Test Coverage

| Component | Unit Tests | Integration Tests | E2E Tests |
|-----------|------------|-------------------|-----------|
| ScheduleTemplateService | ⚠️ TODO | ⚠️ TODO | ✅ Manual |
| LeaveRequestService | ⚠️ TODO | ⚠️ TODO | ✅ Manual |
| WorkSummaryCalculator | ⚠️ TODO | ⚠️ TODO | ✅ Manual |
| API Routes | ⚠️ TODO | ⚠️ TODO | ✅ Postman |
| UI Components | ⚠️ TODO | ⚠️ TODO | ✅ Manual |

**Note:** Automated tests to be added in future sprints.

---

## 🚀 Pre-Production Checklist

- [ ] All API endpoints tested
- [ ] RLS policies verified
- [ ] Cron jobs tested in staging
- [ ] UI tested on mobile
- [ ] Edge cases handled
- [ ] Error messages user-friendly
- [ ] Documentation complete
- [ ] Demo video recorded

---

**Status:** Ready for UAT  
**Next:** Deploy to staging for user acceptance testing
