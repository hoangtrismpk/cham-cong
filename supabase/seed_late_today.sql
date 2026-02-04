-- FORCE LATE ATTENDANCE FOR TODAY
-- This script picks 5 random employees and makes them "Late" for today.

do $$
declare
  r record;
  v_late_time timestamptz;
  v_note text;
begin
  -- Select 5 profiles to be late
  for r in (select id from profiles order by random() limit 5) loop
    
    -- 1. Determine Late Time (09:00 - 10:30)
    v_late_time := current_date + time '09:00' + (random() * interval '90 minutes');
    
    -- 2. Clean up any existing log for today for this user
    delete from attendance_logs where user_id = r.id and work_date = current_date;

    -- 3. Insert LATE check-in
    insert into attendance_logs (
      user_id,
      work_date,
      check_in_time,
      check_out_time, -- Keeping them "Currently In"
      status,
      check_in_location,
      check_in_note
    ) values (
      r.id,
      current_date,
      v_late_time,
      null,
      'late', -- Force status to 'late'
      point(10.762622, 106.660172),
      'Warning: Late Arrival detected'
    );
    
  end loop;
end $$;
