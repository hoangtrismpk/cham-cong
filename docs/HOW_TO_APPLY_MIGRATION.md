# How to Apply Migration via Supabase Dashboard

## Option 1: Using Supabase Dashboard (Recommended ⭐)

### Steps:
1. **Mở Supabase Dashboard:**
   - Vào: https://supabase.com/dashboard/project/uffyhbinfvivqnjrhvvq

2. **Vào SQL Editor:**
   - Click vào menu bên trái: **SQL Editor**
   - Hoặc dùng shortcut: https://supabase.com/dashboard/project/uffyhbinfvivqnjrhvvq/sql

3. **Tạo Query Mới:**
   - Click nút **"New query"**

4. **Copy Migration SQL:**
   - Mở file: `supabase/migrations/20260207_employment_types_and_leaves.sql`
   - Copy toàn bộ nội dung

5. **Paste và Run:**
   - Paste vào SQL Editor
   - Click **"Run"** hoặc nhấn `Ctrl + Enter`

6. **Verify:**
   - Kiểm tra output để đảm bảo không có lỗi
   - Nếu thành công, bạn sẽ thấy message: "Migration completed successfully!"

---

## Option 2: Using Supabase CLI (If Installed)

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref uffyhbinfvivqnjrhvvq

# Apply migration
supabase db push
```

---

## Option 3: Using PostgreSQL Client (Advanced)

### Nếu bạn có psql installed:

```bash
psql "postgresql://postgres.uffyhbinfvivqnjrhvvq:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres" -f supabase/migrations/20260207_employment_types_and_leaves.sql
```

### Nếu bạn có Node.js pg library:

```bash
node scripts/apply-migration-pg.js 20260207_employment_types_and_leaves.sql
```

**⚠️ Lưu ý:** Bạn cần thay `[YOUR-PASSWORD]` bằng database password thực tế.

---

## Recommended Approach

**👉 Sử dụng Option 1 (Supabase Dashboard)** vì:
- ✅ Không cần cài tools
- ✅ Không cần hardcode password
- ✅ Có syntax highlighting
- ✅ Có error messages rõ ràng
- ✅ Có history của các queries đã chạy

---

## After Migration

Sau khi apply migration thành công, verify bằng cách chạy query sau trong SQL Editor:

```sql
-- Check if tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'employee_default_schedules',
  'leave_requests',
  'daily_work_summary',
  'company_schedule_config'
);

-- Check if employment_type column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'employees' 
AND column_name = 'employment_type';
```

Nếu trả về 4 tables và 1 column thì migration đã thành công! ✅
