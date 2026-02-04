-- ACTIVE PERSONNEL SEEDER (GMT+7 Aware)
-- Generates mixed "Present" and "Late" check-ins for TODAY.
-- Adjusted for Vietnam Time (UTC+7).

do $$
declare
  r record;
  v_check_in timestamptz;
  v_status text;
  i int := 0;
begin
  -- Clear existing logs for today to avoid duplicates/mess
  delete from attendance_logs where work_date = current_date;

  -- Select 6 random profiles
  for r in (select id from profiles order by random() limit 6) loop
    i := i + 1;
    
    -- First 3 users: ON TIME (08:00 - 08:29 GMT+7) => (01:00 - 01:29 UTC)
    if i <= 3 then
       v_check_in := current_date + time '01:00:00' + (random() * interval '29 minutes');
       v_status := 'present';
       
    -- Last 3 users: LATE (08:45 - 09:30 GMT+7) => (01:45 - 02:30 UTC)
    else
       v_check_in := current_date + time '01:45:00' + (random() * interval '45 minutes');
       v_status := 'late';
    end if;

    -- Insert Log
    insert into attendance_logs (
      user_id,
      work_date,
      check_in_time,
      check_out_time, -- NULL for "Currently In"
      status,
      check_in_location,
      check_in_note
    ) values (
      r.id,
      current_date,
      v_check_in,
      null,
      v_status,
      point(10.762622, 106.660172),
      'Seeded active log'
    );
    
  end loop;
end $$;
