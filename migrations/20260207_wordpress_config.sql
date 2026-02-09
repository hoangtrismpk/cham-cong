-- Migration: WordPress Configuration
-- Created: 2026-02-07
-- Purpose: Store WordPress integration settings for media upload

-- Create wordpress_config table
CREATE TABLE IF NOT EXISTS wordpress_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_url TEXT NOT NULL,
  username TEXT NOT NULL,
  app_password TEXT NOT NULL, -- Will be encrypted in application layer
  is_active BOOLEAN DEFAULT true,
  last_tested_at TIMESTAMP,
  test_status TEXT CHECK (test_status IN ('success', 'failed', 'pending')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_wordpress_config_active ON wordpress_config(is_active);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_wordpress_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_wordpress_config_updated_at
  BEFORE UPDATE ON wordpress_config
  FOR EACH ROW
  EXECUTE FUNCTION update_wordpress_config_updated_at();

-- Add comment
COMMENT ON TABLE wordpress_config IS 'Stores WordPress integration configuration for media uploads';
COMMENT ON COLUMN wordpress_config.app_password IS 'WordPress Application Password (should be encrypted)';
COMMENT ON COLUMN wordpress_config.test_status IS 'Last connection test result: success, failed, or pending';
