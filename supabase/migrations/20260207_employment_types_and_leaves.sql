-- =====================================================
-- Migration: Employment Types & Advanced Leave Management
-- Created: 2026-02-07
-- Author: Tiger
-- Description: 
--   - Add employment_type to employees
--   - Create employee_default_schedules table
--   - Create leave_requests table
--   - Create daily_work_summary table
-- =====================================================

-- ============================================
-- 1. Modify profiles table (employees data)
-- ============================================

-- Add employment_type column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS employment_type VARCHAR(20) DEFAULT 'full-time'
CHECK (employment_type IN ('full-time', 'part-time', 'intern'));

-- Update comment
COMMENT ON COLUMN profiles.employment_type IS 'Employee type: full-time, part-time, or intern';

-- ============================================
-- 2. Create employee_default_schedules table
-- ============================================

CREATE TABLE IF NOT EXISTS employee_default_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  shift_type VARCHAR(20) NOT NULL CHECK (shift_type IN ('morning', 'evening', 'full', 'custom')),
  custom_start_time TIME,
  custom_end_time TIME,
  is_template BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_employee_day UNIQUE(employee_id, day_of_week)
);

-- Add comments
COMMENT ON TABLE employee_default_schedules IS 'Default weekly schedule templates for employees';
COMMENT ON COLUMN employee_default_schedules.day_of_week IS '0=Sunday, 1=Monday, ..., 6=Saturday';
COMMENT ON COLUMN employee_default_schedules.shift_type IS 'morning (8:30-12:30), evening (13:30-18:00), full (8:30-18:00), custom (use custom times)';
COMMENT ON COLUMN employee_default_schedules.is_template IS 'If true, this schedule repeats every week';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_default_schedules_employee ON employee_default_schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_default_schedules_day ON employee_default_schedules(day_of_week);

-- ============================================
-- 3. Update leave_requests table
-- ============================================

-- Add new columns to existing leave_requests table
ALTER TABLE leave_requests
ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS leave_type VARCHAR(30) CHECK (leave_type IN ('full_day', 'half_day_morning', 'half_day_afternoon', 'partial')),
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME,
ADD COLUMN IF NOT EXISTS duration_hours DECIMAL(4,2),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Migrate data from user_id to employee_id (if user_id exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leave_requests' AND column_name = 'user_id'
  ) THEN
    UPDATE leave_requests SET employee_id = user_id WHERE employee_id IS NULL;
  END IF;
END $$;

-- Add DEFAULT 'full_day' for existing records
UPDATE leave_requests SET leave_type = 'full_day' WHERE leave_type IS NULL;

-- Now make leave_type NOT NULL
ALTER TABLE leave_requests
ALTER COLUMN leave_type SET NOT NULL;

-- Update comments
COMMENT ON TABLE leave_requests IS 'Employee leave requests with support for full-day, half-day, and partial time-off';
COMMENT ON COLUMN leave_requests.leave_type IS 'full_day: entire day off, half_day_morning/afternoon: half day, partial: custom time range';
COMMENT ON COLUMN leave_requests.duration_hours IS 'Calculated leave duration in hours';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_date ON leave_requests(leave_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_approved_by ON leave_requests(approved_by);

-- ============================================
-- 4. Create daily_work_summary table
-- ============================================

CREATE TABLE IF NOT EXISTS daily_work_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  employment_type VARCHAR(20),
  
  -- Schedule information
  scheduled_start_time TIME,
  scheduled_end_time TIME,
  scheduled_hours DECIMAL(4,2),
  
  -- Actual attendance
  clock_in_time TIME,
  clock_out_time TIME,
  clocked_hours DECIMAL(4,2),
  
  -- Leave information
  total_leave_hours DECIMAL(4,2) DEFAULT 0,
  has_full_day_leave BOOLEAN DEFAULT false,
  leave_details JSONB, -- Store leave breakdown for audit
  
  -- Final calculations
  actual_working_hours DECIMAL(4,2), -- clocked_hours - leave_hours
  payable_hours DECIMAL(4,2),        -- includes paid leave
  
  -- Metadata
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  needs_recalculation BOOLEAN DEFAULT false,
  
  CONSTRAINT unique_employee_work_date UNIQUE(employee_id, work_date)
);

-- Add comments
COMMENT ON TABLE daily_work_summary IS 'Daily work summary combining attendance and leave data for payroll calculation';
COMMENT ON COLUMN daily_work_summary.actual_working_hours IS 'Actual hours worked (clocked - leave)';
COMMENT ON COLUMN daily_work_summary.payable_hours IS 'Total payable hours including approved leaves';
COMMENT ON COLUMN daily_work_summary.needs_recalculation IS 'Flag to mark records that need to be recalculated';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_daily_summary_employee ON daily_work_summary(employee_id);
CREATE INDEX IF NOT EXISTS idx_daily_summary_date ON daily_work_summary(work_date);
CREATE INDEX IF NOT EXISTS idx_daily_summary_employee_date ON daily_work_summary(employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_daily_summary_needs_recalc ON daily_work_summary(needs_recalculation) WHERE needs_recalculation = true;

-- ============================================
-- 5. Create trigger for updated_at timestamps
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for employee_default_schedules
DROP TRIGGER IF EXISTS update_employee_default_schedules_updated_at ON employee_default_schedules;
CREATE TRIGGER update_employee_default_schedules_updated_at
  BEFORE UPDATE ON employee_default_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Triggers for leave_requests
DROP TRIGGER IF EXISTS update_leave_requests_updated_at ON leave_requests;
CREATE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. Create RLS (Row Level Security) Policies
-- ============================================

-- Enable RLS on new tables
ALTER TABLE employee_default_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_work_summary ENABLE ROW LEVEL SECURITY;

-- Policies for employee_default_schedules
CREATE POLICY "Employees can view their own schedules"
  ON employee_default_schedules FOR SELECT
  USING (employee_id = auth.uid()::uuid);

CREATE POLICY "HR and admins can view all schedules"
  ON employee_default_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()::uuid
      AND r.name IN ('admin', 'hr')
    )
  );

CREATE POLICY "HR and admins can modify schedules"
  ON employee_default_schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()::uuid
      AND r.name IN ('admin', 'hr')
    )
  );

-- Policies for leave_requests
CREATE POLICY "Employees can view their own leave requests"
  ON leave_requests FOR SELECT
  USING (employee_id = auth.uid()::uuid);

CREATE POLICY "Employees can create their own leave requests"
  ON leave_requests FOR INSERT
  WITH CHECK (employee_id = auth.uid()::uuid);

CREATE POLICY "Employees can update their pending requests"
  ON leave_requests FOR UPDATE
  USING (employee_id = auth.uid()::uuid AND status = 'pending');

CREATE POLICY "Managers can view all leave requests"
  ON leave_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()::uuid
      AND r.name IN ('admin', 'hr', 'manager')
    )
  );

CREATE POLICY "Managers can approve/reject leave requests"
  ON leave_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()::uuid
      AND r.name IN ('admin', 'hr', 'manager')
    )
  );

-- Policies for daily_work_summary
CREATE POLICY "Employees can view their own work summaries"
  ON daily_work_summary FOR SELECT
  USING (employee_id = auth.uid()::uuid);

CREATE POLICY "Admins and HR can view all work summaries"
  ON daily_work_summary FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()::uuid
      AND r.name IN ('admin', 'hr')
    )
  );

CREATE POLICY "System can insert/update work summaries"
  ON daily_work_summary FOR ALL
  USING (TRUE); -- This will be controlled by service role key

-- ============================================
-- 7. Create helper functions
-- ============================================

-- Function to calculate leave duration
CREATE OR REPLACE FUNCTION calculate_leave_duration(
  p_leave_type VARCHAR,
  p_start_time TIME,
  p_end_time TIME,
  p_scheduled_hours DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  v_duration DECIMAL;
BEGIN
  CASE p_leave_type
    WHEN 'full_day' THEN
      v_duration := p_scheduled_hours;
    WHEN 'half_day_morning' THEN
      v_duration := p_scheduled_hours / 2;
    WHEN 'half_day_afternoon' THEN
      v_duration := p_scheduled_hours / 2;
    WHEN 'partial' THEN
      -- Calculate hours between start and end time
      v_duration := EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 3600;
    ELSE
      v_duration := 0;
  END CASE;
  
  RETURN ROUND(v_duration, 2);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_leave_duration IS 'Calculate leave duration in hours based on leave type and times';

-- ============================================
-- 8. Insert default company schedule config
-- ============================================

-- Create a config table for company-wide schedule settings
CREATE TABLE IF NOT EXISTS company_schedule_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key VARCHAR(50) UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE company_schedule_config IS 'Company-wide schedule configuration';

-- Insert default schedule times
INSERT INTO company_schedule_config (config_key, config_value, description)
VALUES 
  ('default_fulltime_hours', '{"start": "08:30", "end": "18:00", "break_start": "12:30", "break_end": "13:30"}', 'Default full-time working hours'),
  ('default_morning_shift', '{"start": "08:30", "end": "12:30"}', 'Default morning shift hours'),
  ('default_evening_shift', '{"start": "13:30", "end": "18:00"}', 'Default evening shift hours')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================
-- 9. Create audit log trigger for leave approvals
-- ============================================

CREATE OR REPLACE FUNCTION log_leave_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when status changes to approved or rejected
  IF (NEW.status IN ('approved', 'rejected') AND OLD.status = 'pending') THEN
    INSERT INTO audit_logs (
      user_id,
      action,
      resource_type,
      resource_id,
      details,
      created_at
    ) VALUES (
      NEW.approved_by,
      CONCAT('leave_request_', NEW.status),
      'leave_request',
      NEW.id,
      jsonb_build_object(
        'employee_id', NEW.employee_id,
        'leave_date', NEW.leave_date,
        'leave_type', NEW.leave_type,
        'duration_hours', NEW.duration_hours,
        'previous_status', OLD.status,
        'new_status', NEW.status,
        'rejection_reason', NEW.rejection_reason
      ),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS log_leave_approval_trigger ON leave_requests;
CREATE TRIGGER log_leave_approval_trigger
  AFTER UPDATE ON leave_requests
  FOR EACH ROW
  WHEN (NEW.status <> OLD.status)
  EXECUTE FUNCTION log_leave_approval();

-- ============================================
-- Migration Complete
-- ============================================

-- Verify tables were created
DO $$
DECLARE
  v_tables TEXT[] := ARRAY[
    'employee_default_schedules',
    'leave_requests',
    'daily_work_summary',
    'company_schedule_config'
  ];
  v_table TEXT;
BEGIN
  FOREACH v_table IN ARRAY v_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = v_table
    ) THEN
      RAISE EXCEPTION 'Table % was not created successfully', v_table;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Migration completed successfully! All tables created.';
END $$;
