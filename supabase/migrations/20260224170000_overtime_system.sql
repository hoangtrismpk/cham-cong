-- =================================================
-- Migration: Overtime Management System (Option D)
-- Date: 2026-02-24
-- Description: Add overtime control to schedules,
--   create overtime_requests table for audit trail,
--   and add overtime_hours to attendance_logs for
--   pre-computed performance.
-- =================================================

-- 1. Add allow_overtime to employee_default_schedules
ALTER TABLE employee_default_schedules
ADD COLUMN IF NOT EXISTS allow_overtime BOOLEAN DEFAULT false;

-- 2. Add allow_overtime to work_schedules (per-day override)
ALTER TABLE work_schedules
ADD COLUMN IF NOT EXISTS allow_overtime BOOLEAN DEFAULT false;

-- 3. Add overtime_hours to attendance_logs (pre-computed for report performance)
ALTER TABLE attendance_logs
ADD COLUMN IF NOT EXISTS overtime_hours DECIMAL(5,2) DEFAULT 0;

-- 4. Create overtime_requests table
CREATE TABLE IF NOT EXISTS overtime_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    request_date DATE NOT NULL,
    planned_hours DECIMAL(4,2) NOT NULL DEFAULT 0,
    actual_hours DECIMAL(4,2) DEFAULT 0,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_note TEXT,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_overtime_requests_user_date
ON overtime_requests(user_id, request_date);

CREATE INDEX IF NOT EXISTS idx_overtime_requests_status
ON overtime_requests(status);

CREATE INDEX IF NOT EXISTS idx_attendance_logs_overtime
ON attendance_logs(user_id, work_date) WHERE overtime_hours > 0;

-- 6. RLS Policies for overtime_requests
ALTER TABLE overtime_requests ENABLE ROW LEVEL SECURITY;

-- Users can read their own requests
CREATE POLICY "Users can view own overtime requests"
ON overtime_requests FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own requests
CREATE POLICY "Users can create own overtime requests"
ON overtime_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all overtime requests"
ON overtime_requests FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'hr_manager', 'manager')
    )
);

-- Admins can update any request (approve/reject)
CREATE POLICY "Admins can update overtime requests"
ON overtime_requests FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'hr_manager', 'manager')
    )
);
