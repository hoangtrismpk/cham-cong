-- FINAL RLS FIX FOR ATTENDANCE LOGS
-- This script ensures both Employees and Admins can actually UPDATE their logs (for check-out).

-- 1. Enable UPDATE for users on their own logs
drop policy if exists "Users can update own attendance logs." on public.attendance_logs;
create policy "Users can update own attendance logs."
on public.attendance_logs
for update
using ( auth.uid() = user_id )
with check ( auth.uid() = user_id );

-- 2. Ensure Admins can also update (in case they need to fix things)
drop policy if exists "Admins can update all attendance logs" on public.attendance_logs;
create policy "Admins can update all attendance logs"
on public.attendance_logs
for update
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

-- 3. Verify SELECT policy is also inclusive
drop policy if exists "Users can view own attendance logs." on public.attendance_logs;
create policy "Users can view own attendance logs."
on public.attendance_logs
for select
using ( auth.uid() = user_id );

-- 4. Re-verify Admin Select
drop policy if exists "Admins can view all attendance logs" on public.attendance_logs;
create policy "Admins can view all attendance logs"
on public.attendance_logs
for select
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);
