-- FIX PERMISSIONS & PROMOTE ADMIN (Corrections)
-- Removed invalid 'email' column reference.

-- 1. Promote your account to Admin (Using full_name only)
-- Note: 'profiles' table does not have an email column.
update public.profiles
set role = 'admin'
where full_name ilike '%Hoàng Trí%';

-- 2. Update Policy: Allow Admins to see ALL attendance logs
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

-- 3. Run the SEED V3 Logic again
do $$
declare
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  i int := 0;
  r record;
begin
  -- Clear today's logs
  delete from attendance_logs where work_date = v_today;

  -- Create logs for random employees
  for r in (select id from profiles order by random() limit 8) loop
    i := i + 1;
    if i <= 3 then -- ON TIME
        insert into attendance_logs (user_id, work_date, check_in_time, status, check_in_location)
        values (r.id, v_today, v_today + time '01:00:00', 'present', point(10.762, 106.660));
    elsif i <= 6 then -- LATE
        insert into attendance_logs (user_id, work_date, check_in_time, status, check_in_note, check_in_location)
        values (r.id, v_today, v_today + time '02:30:00', 'late', 'Traffic', point(10.762, 106.660));
    else -- CHECKED OUT
        insert into attendance_logs (user_id, work_date, check_in_time, check_out_time, status, check_in_location)
        values (r.id, v_today, v_today + time '01:00:00', v_today + time '10:00:00', 'present', point(10.762, 106.660));
    end if;
  end loop;
end $$;
