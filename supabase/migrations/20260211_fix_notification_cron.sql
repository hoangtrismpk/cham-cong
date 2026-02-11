-- Fix the cron job to use the correct schedule and proper service_role key
-- Step 1: Remove old cron job if exists
SELECT cron.unschedule('check-shifts-every-10-min');

-- Step 2: Add notification_type 'admin_test' support to notification_logs
-- (allow null shift_id for test notifications)
ALTER TABLE public.notification_logs ALTER COLUMN shift_id DROP NOT NULL;

-- Step 3: Recreate cron job with corrected schedule (every 5 minutes)
-- IMPORTANT: Replace YOUR_SERVICE_ROLE_KEY below with your actual Supabase service_role key
-- You can find it at: https://supabase.com/dashboard/project/uffyhbinfvivqnjrhvvq/settings/api
SELECT cron.schedule(
  'check-reminder-every-5-min',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://uffyhbinfvivqnjrhvvq.supabase.co/functions/v1/check-reminder',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
        body:='{}'::jsonb
    ) AS request_id;
  $$
);

-- Note: After applying this migration, you MUST:
-- 1. Set FIREBASE_SERVICE_ACCOUNT_B64 secret in Supabase Edge Function secrets
-- 2. Replace YOUR_SERVICE_ROLE_KEY with actual service_role key from Supabase Dashboard
-- 3. Deploy the updated check-reminder Edge Function
