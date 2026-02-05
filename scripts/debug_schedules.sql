-- Kiểm tra ca làm việc hiện có trong database
SELECT 
    ws.id,
    ws.work_date,
    ws.start_time,
    ws.end_time,
    ws.title,
    u.email
FROM work_schedules ws
JOIN auth.users u ON ws.user_id = u.id
WHERE ws.work_date = '2026-02-04'
ORDER BY ws.start_time;
