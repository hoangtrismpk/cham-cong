# 🎯 QUICK START GUIDE - Employment Management UI

**Created:** 2026-02-07  
**For:** Admin/HR to manage employee types and schedules

---

## ✅ WHAT'S NEW

Tiger vừa build xong **3 pages + 2 APIs** để bạn quản lý nhân viên!

### 📦 Files Created:

1. **Employee List Page**
   - Path: `/admin/employees`
   - File: `app/admin/employees/page.tsx`
   - Features:
     - ✅ View all employees
     - ✅ Search by name/email
     - ✅ Stats dashboard
     - ✅ Link to employment management

2. **Employment Management Page**
   - Path: `/admin/employees/[id]/employment`
   - File: `app/admin/employees/[id]/employment/page.tsx`
   - Features:
     - ✅ Select employment type (3 beautiful cards)
     - ✅ Configure schedules (auto-switching UI)
     - ✅ Save to database

3. **Employee APIs**
   - `GET /api/employees` - List all employees
   - `GET /api/employees/[id]` - Get employee info
   - `PATCH /api/employees/[id]` - Update employment type

---

## 🚀 HOW TO USE

### Step 1: Access Employee List

```
http://localhost:3000/admin/employees
```

You'll see:
- Total employees count
- Breakdown by type (Full-time, Part-time, Intern)
- Searchable table
- "Quản lý" button for each employee

### Step 2: Click "Quản lý" Button

For any employee, click the blue "Quản lý" button.

You'll be taken to:
```
http://localhost:3000/admin/employees/{employee-id}/employment
```

### Step 3: Set Employment Type

**Choose one of 3 options:**

1. **👔 Toàn thời gian (Full-time)**
   - Monday-Friday
   - 08:30 - 18:00
   - Auto schedule (read-only)

2. **⏰ Bán thời gian (Part-time)**
   - Select shifts for each day
   - Morning: 08:30-12:30
   - Evening: 13:30-18:00

3. **🎓 Thực tập sinh (Intern)**
   - Custom hours for each day
   - Flexible start/end times

### Step 4: Configure Schedule (Optional)

After selecting type, scroll down to configure detailed schedule:

- **Full-time**: View only (auto-configured)
- **Part-time**: Select morning/evening for each day
- **Intern**: Set custom hours for each day

### Step 5: Save

Click "Lưu lịch làm việc" button.

Done! ✅

---

## 📊 UI COMPONENTS REUSED

Tiger tái sử dụng **100%** components đã build:

✅ **EmploymentTypeSelector** - 3 beautiful cards  
✅ **ScheduleTemplateEditor** - Smart mode switching  
✅ **FulltimeScheduleInfo** - Read-only display  
✅ **ParttimeScheduleEditor** - Shift selector  
✅ **InternScheduleEditor** - Custom time editor

**Zero duplication!** All components work together perfectly.

---

## 🧪 TESTING

### Test 1: View Employee List

```bash
# Server should be running: http://localhost:3000
# Navigate to:
http://localhost:3000/admin/employees
```

**Expected:**
- List of all employees
- Stats cards showing breakdown
- Search bar working

### Test 2: Edit Single Employee

```bash
# Click "Quản lý" button on any employee
# URL changes to:
http://localhost:3000/admin/employees/{id}/employment
```

**Expected:**
- Employee name and avatar
- 3 employment type cards
- Schedule editor below

### Test 3: Save Employment Type

1. Select "Full-time"
2. Should see success message
3. Refresh page
4. Employment type should persist

### Test 4: Configure Schedule

1. Select "Part-time"
2. Scroll to schedule editor
3. Select shifts for each day
4. Click "Lưu lịch làm việc"
5. Should see success

---

## 🔧 FOR YOUR MANUAL SETUP (Optional)

If you want to set employees via SQL instead of UI:

```sql
-- Set employment type for an employee
UPDATE profiles 
SET employment_type = 'full-time'  -- or 'part-time' or 'intern'
WHERE email = 'employee@company.com';

-- Add full-time schedule (Monday-Friday)
INSERT INTO employee_default_schedules (employee_id, day_of_week, shift_type)
SELECT id, day, 'full' 
FROM profiles 
CROSS JOIN generate_series(1, 5) AS day
WHERE email = 'employee@company.com';

-- Add part-time morning shifts (Mon/Wed/Fri)
INSERT INTO employee_default_schedules (employee_id, day_of_week, shift_type)
SELECT id, day, 'morning'
FROM profiles, unnest(ARRAY[1,3,5]) AS day
WHERE email = 'employee@company.com';

-- Add intern custom schedule (Mon: 9-3, Wed: 10-4)
INSERT INTO employee_default_schedules 
  (employee_id, day_of_week, shift_type, custom_start_time, custom_end_time)
VALUES
  ((SELECT id FROM profiles WHERE email = 'intern@company.com'), 1, 'custom', '09:00', '15:00'),
  ((SELECT id FROM profiles WHERE email = 'intern@company.com'), 3, 'custom', '10:00', '16:00');
```

---

## 🎨 UI SCREENSHOTS

### Employee List Page
```
┌────────────────────────────────────────────────┐
│ 👥 Quản lý nhân viên                           │
│ Quản lý thông tin và phân loại nhân viên       │
│                                                │
│ ┌──────────────────────────────────────┐      │
│ │ 🔍 Tìm kiếm theo tên hoặc email...  │      │
│ └──────────────────────────────────────┘      │
│                                                │
│ [30] Tổng  [20] Full-time  [8] Part  [2] Intern│
│                                                │
│ ┌──────────────────────────────────────────┐  │
│ │ Name         │ Type          │ Action    │  │
│ │ John Doe     │ 👔 Toàn TG    │ [Quản lý] │  │
│ │ Jane Smith   │ ⏰ Bán TG     │ [Quản lý] │  │
│ │ Bob Wilson   │ ⚠️ Chưa setup │ [Quản lý] │  │
│ └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

### Employment Management Page
```
┌────────────────────────────────────────────────┐
│ ← Quay lại                                     │
│                                                │
│ [JD] Quản lý nhân viên: John Doe              │
│      john@company.com                          │
│                                                │
│ ┌──────────────────────────────────────────┐  │
│ │ Bước 1: Chọn loại nhân viên       [Required]│
│ │                                            │  │
│ │ [👔 Full-time] [⏰ Part-time] [🎓 Intern] │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│ ┌──────────────────────────────────────────┐  │
│ │ Bước 2: Thiết lập lịch làm việc   [Optional]│
│ │                                            │  │
│ │ [Schedule Editor Component Here]          │  │
│ └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

---

## 🚀 READY TO USE!

**Server is running:** `http://localhost:3000`

**Navigate to:** `http://localhost:3000/admin/employees`

---

## 💡 TIPS

1. **Bulk Update Later:**
   - For now, use UI one-by-one (30 people is manageable)
   - Tiger can add CSV import later if needed

2. **Default Schedules:**
   - Full-time auto-creates Mon-Fri schedule
   - Part-time and Intern need manual config

3. **Future Scalability:**
   - UI handles 100s of employees
   - Search/filter works efficiently
   - Can add bulk actions later

4. **Mobile Friendly:**
   - Responsive design works on tablets
   - Best on desktop for management tasks

---

## 📞 NEED HELP?

**Issues?**
- Check browser console for errors
- Verify server is running
- Check Supabase authentication

**Questions?**
- Read `docs/EMPLOYMENT_LEAVE_USER_GUIDE.md`
- Check `docs/TESTING_GUIDE.md`

---

**🎉 YOU'RE ALL SET! Go manage your employees! 🎉**

Start here: `http://localhost:3000/admin/employees`
