-- Seed attendance for Hoàng Trí for the current week (Feb 2 - Feb 8, 2026)
DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- 1. Find the user ID
    SELECT id INTO target_user_id FROM public.profiles WHERE full_name = 'Hoàng Trí' LIMIT 1;

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User Hoàng Trí not found';
        RETURN;
    END IF;

    -- 2. Clear logs for current week for this user to ensure clean seed
    DELETE FROM public.attendance_logs 
    WHERE user_id = target_user_id 
    AND work_date >= '2026-02-02' 
    AND work_date <= '2026-02-08';

    -- 3. Insert specific pattern
    -- Thứ 2 (Monday Feb 2) - Fulltime
    INSERT INTO public.attendance_logs (user_id, work_date, check_in_time, check_out_time, status)
    VALUES (target_user_id, '2026-02-02', '2026-02-02 08:30:00+07', '2026-02-02 17:30:00+07', 'present');

    -- Thứ 3 (Tuesday Feb 3) - Fulltime (Today)
    INSERT INTO public.attendance_logs (user_id, work_date, check_in_time, check_out_time, status)
    VALUES (target_user_id, '2026-02-03', '2026-02-03 08:25:00+07', '2026-02-03 17:40:00+07', 'present');

    -- Thứ 4 (Wednesday Feb 4) - Fulltime
    INSERT INTO public.attendance_logs (user_id, work_date, check_in_time, check_out_time, status)
    VALUES (target_user_id, '2026-02-04', '2026-02-04 08:30:00+07', '2026-02-04 17:35:00+07', 'present');

    -- Thứ 5 (Thursday Feb 5) - Morning Only
    INSERT INTO public.attendance_logs (user_id, work_date, check_in_time, check_out_time, status)
    VALUES (target_user_id, '2026-02-05', '2026-02-05 08:30:00+07', '2026-02-05 12:00:00+07', 'present');

    -- Thứ 6 (Friday Feb 6) - Morning Only
    INSERT INTO public.attendance_logs (user_id, work_date, check_in_time, check_out_time, status)
    VALUES (target_user_id, '2026-02-06', '2026-02-06 08:30:00+07', '2026-02-06 12:15:00+07', 'present');

    -- Thứ 7 (Saturday Feb 7) - (User said "thứ 7, chỉ làm chủ nhật", interpret as Sat Off)
    
    -- Chủ nhật (Sunday Feb 8) - Working
    INSERT INTO public.attendance_logs (user_id, work_date, check_in_time, check_out_time, status)
    VALUES (target_user_id, '2026-02-08', '2026-02-08 09:00:00+07', '2026-02-08 17:00:00+07', 'present');

END $$;
