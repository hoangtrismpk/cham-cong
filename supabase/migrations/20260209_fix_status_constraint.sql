-- Add missing status values to work_reports table
ALTER TABLE public.work_reports 
  DROP CONSTRAINT IF EXISTS work_reports_status_check;

ALTER TABLE public.work_reports
  ADD CONSTRAINT work_reports_status_check 
  CHECK (status IN ('submitted', 'reviewed', 'approved', 'changes_requested', 'rejected'));
