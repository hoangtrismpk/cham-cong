# 📋 Database Quick Reference

**Last Updated:** 2026-02-07 08:45

---

## 🔍 Quick Table Lookup

| Table Name | Primary Purpose | Key Columns |
|------------|----------------|-------------|
| `profiles` | Employee master data | `id`, `email`, `full_name`, `employment_type` ⭐ |
| `roles` | Permission system | `id`, `name`, `permissions[]` |
| `employee_default_schedules` | Weekly schedule templates | `employee_id`, `day_of_week`, `shift_type` ⭐ |
| `leave_requests` | Leave management | `employee_id`, `leave_type` ⭐, `status` |
| `daily_work_summary` | Payroll calculation | `employee_id`, `work_date`, `payable_hours` ⭐ |
| `company_schedule_config` | Company-wide settings | `config_key`, `config_value` |

⭐ = NEW or UPDATED in v2.0

---

## ⚡ Common Queries

### Get employee with employment type
```sql
SELECT id, full_name, email, employment_type
FROM profiles
WHERE id = '<user-id>';
```

### Get employee's default schedule
```sql
SELECT day_of_week, shift_type, custom_start_time, custom_end_time
FROM employee_default_schedules
WHERE employee_id = '<user-id>'
ORDER BY day_of_week;
```

### Get pending leave requests
```sql
SELECT lr.*, p.full_name
FROM leave_requests lr
JOIN profiles p ON lr.employee_id = p.id
WHERE lr.status = 'pending'
ORDER BY lr.leave_date;
```

### Calculate working hours for a date range
```sql
SELECT 
  employee_id,
  SUM(actual_working_hours) as total_worked,
  SUM(payable_hours) as total_payable
FROM daily_work_summary
WHERE work_date BETWEEN '<start-date>' AND '<end-date>'
GROUP BY employee_id;
```

---

## 🔑 Foreign Key Relationships

```
profiles (id) ←─┬─── employee_default_schedules (employee_id)
                ├─── leave_requests (employee_id)
                ├─── leave_requests (approved_by)
                └─── daily_work_summary (employee_id)

roles (id) ←─────── profiles (role_id)
```

---

## 🎯 Enum Values

### employment_type
- `full-time` (default)
- `part-time`
- `intern`

### shift_type
- `morning` → 08:30-12:30
- `evening` → 13:30-18:00
- `full` → 08:30-18:00
- `custom` → Use custom_start_time/end_time

### leave_type
- `full_day` → Nghỉ cả ngày
- `half_day_morning` → Nghỉ buổi sáng
- `half_day_afternoon` → Nghỉ buổi chiều
- `partial` → Nghỉ khoảng thời gian tùy chỉnh

### status (leave_requests)
- `pending` (default)
- `approved`
- `rejected`
- `cancelled`

---

## ⚠️ Important Rules

1. **ALWAYS use `profiles` table, NOT `employees`**
2. **Check RLS policies** before querying from client-side
3. **Use service_role key** for background jobs
4. **UNIQUE constraint** on (employee_id, day_of_week) in schedules
5. **UNIQUE constraint** on (employee_id, work_date) in summaries

---

## 🛠️ Helper Functions

### Calculate leave duration
```sql
SELECT calculate_leave_duration(
  'partial',           -- leave_type
  '09:30'::TIME,      -- start_time
  '14:00'::TIME,      -- end_time
  8.0                 -- scheduled_hours
);
-- Returns: 4.50
```

### Check permission
```sql
SELECT check_user_permission(
  '<user-id>'::UUID,
  'users.edit'
);
-- Returns: true/false
```

---

## 📞 Quick Help

- Full schema: See `docs/DATABASE_SCHEMA.md`
- Migration history: `supabase/migrations/`
- Verify tables: Run `node scripts/verify-migration.js`

**Last Updated:** 2026-02-07 08:45
