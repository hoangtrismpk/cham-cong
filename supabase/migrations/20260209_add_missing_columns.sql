-- Add missing 'message' column to notifications table
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS message TEXT;

-- Also add reviewer_note to work_reports if not exists
ALTER TABLE public.work_reports 
  ADD COLUMN IF NOT EXISTS reviewer_note TEXT;
