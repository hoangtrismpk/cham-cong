-- Add auto_checkin_enabled to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS auto_checkin_enabled BOOLEAN DEFAULT false;
