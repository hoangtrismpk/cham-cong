-- =====================================================
-- CREATE KNOWN_DEVICES TABLE
-- Created: 2026-02-26
-- Purpose: Track devices used to login for unknown device detection
-- =====================================================

CREATE TABLE IF NOT EXISTS known_devices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fingerprint TEXT NOT NULL,
    device_name TEXT NOT NULL DEFAULT 'Unknown',
    ip_address TEXT,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate fingerprints per user
    UNIQUE(user_id, fingerprint)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_known_devices_user_id ON known_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_known_devices_fingerprint ON known_devices(user_id, fingerprint);

-- RLS
ALTER TABLE known_devices ENABLE ROW LEVEL SECURITY;

-- Users can only see their own devices
DROP POLICY IF EXISTS "Users can read own devices" ON known_devices;
CREATE POLICY "Users can read own devices"
    ON known_devices FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can insert/update (for the server-side detection)
DROP POLICY IF EXISTS "Service role full access" ON known_devices;
CREATE POLICY "Service role full access"
    ON known_devices FOR ALL
    USING (true)
    WITH CHECK (true);
