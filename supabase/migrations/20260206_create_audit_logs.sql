-- =====================================================
-- AUDIT LOG SYSTEM
-- Created: 2026-02-06
-- Purpose: Track all admin actions for security and compliance
-- =====================================================

-- 1. CREATE AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Who did it?
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_email TEXT,
  user_name TEXT,
  user_role TEXT,
  
  -- What was done?
  action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', etc.
  resource_type TEXT NOT NULL, -- 'user', 'role', 'setting', 'approval', 'schedule', etc.
  resource_id TEXT, -- ID of the affected resource
  
  -- Details
  description TEXT, -- Human-readable description
  old_values JSONB, -- Previous state (for UPDATE/DELETE)
  new_values JSONB, -- New state (for CREATE/UPDATE)
  
  -- Metadata
  ip_address TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'SUCCESS', -- 'SUCCESS', 'FAILED', 'PARTIAL'
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_composite ON audit_logs(user_id, resource_type, created_at DESC);

-- 3. RLS POLICIES
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin và Manager có thể xem audit logs
DROP POLICY IF EXISTS "Admins view audit logs" ON audit_logs;
CREATE POLICY "Admins view audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() 
      AND (
        '*' = ANY(r.permissions) 
        OR 'settings.view' = ANY(r.permissions)
        OR 'roles.view' = ANY(r.permissions)
      )
    )
  );

-- Chỉ system/admin có thể tạo audit logs (through service role)
DROP POLICY IF EXISTS "Service role insert audit logs" ON audit_logs;
CREATE POLICY "Service role insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true); -- Will be restricted by RLS in app code

-- 4. HELPER FUNCTION: Create Audit Log Entry
CREATE OR REPLACE FUNCTION create_audit_log(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_user_email TEXT;
  v_user_name TEXT;
  v_user_role TEXT;
BEGIN
  -- Get user details
  SELECT email, full_name, roles.display_name
  INTO v_user_email, v_user_name, v_user_role
  FROM profiles
  LEFT JOIN roles ON profiles.role_id = roles.id
  WHERE profiles.id = p_user_id;

  -- Insert audit log
  INSERT INTO audit_logs (
    user_id,
    user_email,
    user_name,
    user_role,
    action,
    resource_type,
    resource_id,
    description,
    old_values,
    new_values,
    ip_address,
    user_agent,
    status
  ) VALUES (
    p_user_id,
    v_user_email,
    v_user_name,
    v_user_role,
    p_action,
    p_resource_type,
    p_resource_id,
    p_description,
    p_old_values,
    p_new_values,
    p_ip_address,
    p_user_agent,
    'SUCCESS'
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. AUTO-CLEANUP OLD LOGS (Optional - keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to run cleanup (requires pg_cron extension)
-- Uncomment if you have pg_cron enabled
-- SELECT cron.schedule('cleanup-audit-logs', '0 0 * * 0', 'SELECT cleanup_old_audit_logs()');
