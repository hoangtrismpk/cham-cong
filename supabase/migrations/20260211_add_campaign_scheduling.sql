
-- Add scheduled_at to notification_campaigns
ALTER TABLE notification_campaigns 
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;

-- Add 'scheduled' to status check constraint
ALTER TABLE notification_campaigns 
DROP CONSTRAINT IF EXISTS notification_campaigns_status_check;

ALTER TABLE notification_campaigns 
ADD CONSTRAINT notification_campaigns_status_check 
CHECK (status IN ('draft', 'scheduled', 'processing', 'completed', 'failed'));

-- Create a function to process scheduled campaigns
CREATE OR REPLACE FUNCTION process_scheduled_campaigns()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    campaign_record RECORD;
BEGIN
    FOR campaign_record IN 
        SELECT id 
        FROM notification_campaigns 
        WHERE status = 'scheduled' 
        AND scheduled_at <= NOW()
    LOOP
        -- Invoke the Edge Function using pg_net (if available) or update to processing to be picked up
        -- Since we can't easily call Edge Function from PLPGSQL in all environments without pg_net extensions...
        -- WE WILL USE A SEPARATE CRON EDGE FUNCTION.
        -- So here just return.
        -- Or better: This SQL file is just for Schema. 
        -- We will handle logic in Edge Function.
    END LOOP;
END;
$$;
