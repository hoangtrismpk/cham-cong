-- Fix RLS policy for notification_logs to allow INSERT from client
-- Users should be able to log their own notifications

-- Drop old policy if exists
DROP POLICY IF EXISTS "Users can view own notification logs" ON notification_logs;
DROP POLICY IF EXISTS "Users can insert own notification logs" ON notification_logs;

-- Allow users to view their own logs
CREATE POLICY "Users can view own notification logs"
ON notification_logs FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own logs
CREATE POLICY "Users can insert own notification logs"
ON notification_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);
