
-- Create notification_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES notification_campaigns(id) ON DELETE SET NULL,
    notification_type TEXT,
    status TEXT, -- 'sent', 'failed'
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    error_message TEXT
);

-- Add tracking columns to notifications table
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES notification_campaigns(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster stats query
CREATE INDEX IF NOT EXISTS idx_notification_logs_campaign_id ON notification_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_notifications_campaign_id ON notifications(campaign_id);

-- Optional: Add policies if RLS is enabled
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all logs" ON notification_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'hr_manager', 'director')
        )
    );
