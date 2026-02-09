# Hướng dẫn Migration: Thêm Numeric Employee ID

## Mục đích
Thay đổi URL từ UUID dài (VD: `/admin/employees/5c318832-de71-40ff-acbd-d8ada7888119`)  
Thành ID ngắn 6 chữ số (VD: `/admin/employees/100000`)

## Bước 1: Chạy Migration trên Supabase

### Cách 1: Qua Supabase Dashboard (Khuyến nghị)
1. Mở Supabase Dashboard: https://supabase.com/dashboard
2. Chọn project của bạn
3. Vào **SQL Editor** (hoặc **Database** → **SQL Editor**)
4. Copy toàn bộ nội dung file `supabase/migrations/20260206_add_numeric_employee_id.sql`
5. Paste vào SQL Editor và click **Run**
6. Kiểm tra kết quả - should see "Success"

### Cách 2: Qua Supabase CLI (Nếu có quyền)
```powershell
# Chạy trong PowerShell với quyền Admin
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
npx supabase db push
```

## Bước 2: Kiểm tra Migration đã chạy thành công

Chạy query này trong SQL Editor để kiểm tra:

```sql
-- Check if numeric_id column exists and has data
SELECT id, numeric_id, full_name, email 
FROM profiles 
ORDER BY numeric_id 
LIMIT 10;
```

Kết quả mong đợi:
- Cột `numeric_id` xuất hiện
- Các giá trị bắt đầu từ 100000, 100001, 100002,...

## Bước 3: Test trên ứng dụng

1. Refresh trang http://localhost:3000/admin/employees
2. Click vào tên một nhân viên
3. URL sẽ thay đổi từ: `/admin/employees/UUID-dài-dài`  
   Thành: `/admin/employees/100000` (hoặc số tăng dần)

## Troubleshooting

### Lỗi: "column already exists"
→ Migration đã chạy rồi, không cần chạy lại

### Lỗi: "permission denied"
→ Cần quyền admin trên Supabase project

### URL vẫn hiển thị UUID
→ Có thể migration chưa chạy hoặc data chưa được sync. Kiểm tra lại query ở Bước 2.

## Rollback (Nếu cần)

Để xóa cột numeric_id:

```sql
DROP SEQUENCE IF EXISTS employee_numeric_id_seq CASCADE;
ALTER TABLE profiles DROP COLUMN IF EXISTS numeric_id;
```
