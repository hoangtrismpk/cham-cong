-- Drop existing status check constraint
ALTER TABLE public.work_reports DROP CONSTRAINT IF EXISTS work_reports_status_check;

-- Add updated check constraint with new statuses
ALTER TABLE public.work_reports ADD CONSTRAINT work_reports_status_check 
    CHECK (status IN ('submitted', 'reviewed', 'approved', 'changes_requested', 'rejected'));

-- Add reviewer_note column for feedback/comments
ALTER TABLE public.work_reports ADD COLUMN IF NOT EXISTS reviewer_note TEXT;
