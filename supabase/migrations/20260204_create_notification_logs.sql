-- Create notification_logs table to track sent notifications
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    shift_id UUID REFERENCES public.work_schedules(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL, -- 'local' or 'server_push'
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'sent', -- 'sent', 'failed'
    
    -- Prevent duplicate notifications for same shift
    UNIQUE(user_id, shift_id, notification_type)
);

-- Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own logs
CREATE POLICY "Users can view own notification logs"
ON notification_logs FOR SELECT
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_notification_logs_user_shift 
ON notification_logs(user_id, shift_id);

CREATE INDEX idx_notification_logs_sent_at 
ON notification_logs(sent_at DESC);
