-- DATA SEEDING SCRIPT
-- Generates 10 Mock Employees + 10 Days of Attendance Data for each.
-- Run this in Supabase SQL Editor.

do $$
declare
  v_user_id uuid;
  v_dept text[] := ARRAY['Engineering', 'Design', 'Marketing', 'Sales', 'Operations'];
  v_dept_idx int;
  i int;
  j int;
  v_date date;
  v_check_in timestamptz;
  v_check_out timestamptz;
  v_status text;
  v_email text;
begin
  -- Loop to create 10 users
  for i in 1..10 loop
    v_user_id := gen_random_uuid();
    v_dept_idx := floor(random() * 5 + 1)::int;
    v_email := 'employee' || i || '@test.com';

    -- 1. Insert into auth.users (Mock User with dummy password)
    -- This allows the foreign key in 'profiles' to work
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      '$2a$10$abcdefghijklmnopqrstuvwxyzABC', -- Dummy password hash
      now(),
      '{"provider": "email", "providers": ["email"]}',
      jsonb_build_object(
        'first_name', 'Employee',
        'last_name', i::text,
        'full_name', 'Employee ' || i,
        'department', v_dept[v_dept_idx]
      ),
      now(),
      now(),
      '',
      ''
    );

    -- 2. Insert into public.profiles
    -- Ensure we handle conflict if the Trigger already created the profile
    insert into public.profiles (id, first_name, last_name, full_name, department, role)
    values (
      v_user_id,
      'Employee',
      i::text,
      'Employee ' || i,
      v_dept[v_dept_idx],
      'employee'
    )
    on conflict (id) do nothing;

    -- 3. Generate 10 Days of Logs
    for j in 0..10 loop
      v_date := (current_date - j);
      
      -- Skip weekends (0=Sunday, 6=Saturday)
      if extract(isodow from v_date) not in (6, 7) then
          -- 90% chance of being present
          if random() < 0.9 then
            -- Random Check-in: 07:45 - 09:15
            -- Base: 07:45
            v_check_in := v_date + time '07:45:00' + (random() * interval '90 minutes');
            
            -- Random Check-out: 17:00 - 18:30
            v_check_out := v_date + time '17:00:00' + (random() * interval '90 minutes');
            
            -- Determine status (Late if after 08:30)
            if v_check_in::time > '08:30:00'::time then
               v_status := 'late';
            else
               v_status := 'present';
            end if;

            insert into public.attendance_logs (
              user_id,
              work_date,
              check_in_time,
              check_out_time,
              status,
              check_in_location,
              check_out_location,
              check_in_note,
              check_out_note
            ) values (
              v_user_id,
              v_date,
              v_check_in,
              v_check_out,
              v_status,
              point(10.762622, 106.660172), -- Fake coords
              point(10.762622, 106.660172),
              'Auto-generated log',
              'Auto-generated log'
            );
          end if;
      end if;
    end loop;
  end loop;
end $$;
