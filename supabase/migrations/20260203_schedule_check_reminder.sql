-- Enable extensions required for cron jobs and http requests
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Schedule the cron job
-- Job này sẽ chạy mỗi 10 phút để gọi Edge Function
select cron.schedule(
  'check-shifts-every-10-min',
  '*/10 * * * *', -- Cron expression (Mỗi 10 phút)
  $$
  select
    net.http_post(
        url:='https://uffyhbinfvivqnjrhvvq.supabase.co/functions/v1/check-reminder',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmZnloYmluZnZpdnFuanJodnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjI2ODYsImV4cCI6MjA4NTYzODY4Nn0.0ejBmF2xzMAsX4S7v52rLIhMxW-kLiu4nM3rPkHSqJY"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);
