
-- Create notification_campaigns table
CREATE TABLE IF NOT EXISTS notification_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    target_type TEXT NOT NULL CHECK (target_type IN ('all', 'department', 'role', 'specific_users')),
    target_value JSONB, -- Stores array of IDs
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'failed')),
    total_recipients INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    metadata JSONB
);

-- Enable RLS
ALTER TABLE notification_campaigns ENABLE ROW LEVEL SECURITY;

-- Policy for Admins
CREATE POLICY "Admins can manage campaigns" ON notification_campaigns
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'admin' OR profiles.role = 'manager')
        )
    );

-- Add 'campaign_id' to notification_logs for tracking
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES notification_campaigns(id) ON DELETE SET NULL;

-- Add 'is_read' to notification_logs? No, 'notifications' table handles user-facing read/unread.
-- 'notification_logs' is purely for system delivery logs.

