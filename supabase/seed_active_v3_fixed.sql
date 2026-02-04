-- ACTIVE PERSONNEL SEEDER V3 (FIXED)
-- Purpose: Reset Today's data and ensure 6 Active Employees (3 On Time, 3 Late) + 2 Checked Out.

do $$
declare
  v_profile_count int;
  r record;
  v_now timestamptz := now(); -- Current Timestamp (likely UTC)
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date; -- Force VN Date
  i int := 0;
begin
  -- 1. Ensure we have profiles. If 0, verify data seeding needed.
  select count(*) into v_profile_count from profiles;
  if v_profile_count < 5 then
     raise exception 'Table profiles is almost empty. Please run seed_data.sql first!';
  end if;

  -- 2. RESET today's logs (Clean slate for this demo)
  delete from attendance_logs where work_date = v_today;

  -- 3. Loop through 8 random employees
  for r in (select id from profiles order by random() limit 8) loop
    i := i + 1;
    
    -- Employee 1-3: ACTIVE - ON TIME (Arrived 08:00 VN / 01:00 UTC)
    if i <= 3 then
        insert into attendance_logs (user_id, work_date, check_in_time, check_out_time, status, check_in_location)
        values (
            r.id, 
            v_today, 
            v_today + time '01:00:00', -- 08:00 AM VN
            NULL, 
            'present', 
            point(10.762, 106.660)
        );

    -- Employee 4-6: ACTIVE - LATE (Arrived 09:30 VN / 02:30 UTC)
    elsif i <= 6 then
        insert into attendance_logs (user_id, work_date, check_in_time, check_out_time, status, check_in_note, check_in_location)
        values (
            r.id, 
            v_today, 
            v_today + time '02:30:00', -- 09:30 AM VN
            NULL, 
            'late',
            'Traffic jam',
            point(10.762, 106.660)
        );

    -- Employee 7-8: CHECKED OUT (Arrived 08:00 VN, Left 17:00 VN)
    else
        insert into attendance_logs (user_id, work_date, check_in_time, check_out_time, status, check_in_location)
        values (
            r.id, 
            v_today, 
            v_today + time '01:00:00', -- 08:00 AM VN
            v_today + time '10:00:00', -- 17:00 PM VN
            'present', 
            point(10.762, 106.660)
        );
    end if;
    
  end loop;
end $$;
