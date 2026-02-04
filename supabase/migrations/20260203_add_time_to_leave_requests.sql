-- Add time columns to leave_requests
ALTER TABLE public.leave_requests 
ADD COLUMN IF NOT EXISTS start_time time without time zone,
ADD COLUMN IF NOT EXISTS end_time time without time zone,
ADD COLUMN IF NOT EXISTS total_hours numeric(4, 2);
