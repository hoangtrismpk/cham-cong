-- Seed attendance for Hoàng Trí for the current week (Feb 2 - Feb 8, 2026)
-- Pattern: Mon-Wed Fulltime, Thu-Fri Morning, Sat Fulltime, Sun Off
DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- 1. Tìm user ID của Hoàng Trí
    SELECT id INTO target_user_id FROM public.profiles WHERE full_name = 'Hoàng Trí' LIMIT 1;

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User Hoàng Trí not found';
        RETURN;
    END IF;

    -- 2. Xóa dữ liệu cũ của tuần này (Feb 2 - Feb 8) để dọn dẹp
    DELETE FROM public.attendance_logs 
    WHERE user_id = target_user_id 
    AND work_date >= '2026-02-02' 
    AND work_date <= '2026-02-08';

    -- 3. Chèn dữ liệu theo pattern mới
    -- Thứ 2 (Monday Feb 2) - Fulltime
    INSERT INTO public.attendance_logs (user_id, work_date, check_in_time, check_out_time, status)
    VALUES (target_user_id, '2026-02-02', '2026-02-02 08:30:00+07', '2026-02-02 17:30:00+07', 'present');

    -- Thứ 3 (Tuesday Feb 3) - Fulltime (Hôm nay)
    INSERT INTO public.attendance_logs (user_id, work_date, check_in_time, check_out_time, status)
    VALUES (target_user_id, '2026-02-03', '2026-02-03 08:25:00+07', '2026-02-03 17:40:00+07', 'present');

    -- Thứ 4 (Wednesday Feb 4) - Fulltime
    INSERT INTO public.attendance_logs (user_id, work_date, check_in_time, check_out_time, status)
    VALUES (target_user_id, '2026-02-04', '2026-02-04 08:30:00+07', '2026-02-04 17:35:00+07', 'present');

    -- Thứ 5 (Thursday Feb 5) - Chỉ làm buổi sáng
    INSERT INTO public.attendance_logs (user_id, work_date, check_in_time, check_out_time, status)
    VALUES (target_user_id, '2026-02-05', '2026-02-05 08:30:00+07', '2026-02-05 12:00:00+07', 'present');

    -- Thứ 6 (Friday Feb 6) - Chỉ làm buổi sáng
    INSERT INTO public.attendance_logs (user_id, work_date, check_in_time, check_out_time, status)
    VALUES (target_user_id, '2026-02-06', '2026-02-06 08:30:00+07', '2026-02-06 12:15:00+07', 'present');

    -- Thứ 7 (Saturday Feb 7) - Fulltime
    INSERT INTO public.attendance_logs (user_id, work_date, check_in_time, check_out_time, status)
    VALUES (target_user_id, '2026-02-07', '2026-02-07 08:30:00+07', '2026-02-07 17:00:00+07', 'present');

    -- Chủ nhật (Sunday Feb 8) - NGHỈ (Không chèn dữ liệu)

END $$;
