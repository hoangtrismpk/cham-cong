-- Add clicked_at column to tracking user interaction
ALTER TABLE public.notification_logs
ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMP WITH TIME ZONE;

-- Add RLS to allow users to update their own logs (logging clicks)
DROP POLICY IF EXISTS "Users can update own notification logs" ON notification_logs;

CREATE POLICY "Users can update own notification logs"
ON notification_logs FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
