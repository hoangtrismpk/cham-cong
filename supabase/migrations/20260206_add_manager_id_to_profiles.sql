-- =====================================================
-- ADD MANAGER_ID TO PROFILES
-- Created: 2026-02-06
-- Purpose: Thiết lập quan hệ quản lý trực tiếp (Direct Supervisor)
-- =====================================================

-- 1. Add column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES profiles(id);

-- 2. Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON profiles(manager_id);

-- 3. Comment
COMMENT ON COLUMN profiles.manager_id IS 'ID của người quản lý trực tiếp (Direct Manager)';
