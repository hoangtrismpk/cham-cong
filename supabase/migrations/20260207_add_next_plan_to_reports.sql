-- Add next_plan column to work_reports table
ALTER TABLE public.work_reports ADD COLUMN IF NOT EXISTS next_plan TEXT;
