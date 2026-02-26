-- Add require_password_change column to profiles
ALTER TABLE public.profiles ADD COLUMN require_password_change boolean DEFAULT false;

-- Add a comment explaining the column
COMMENT ON COLUMN public.profiles.require_password_change IS 'Flag to force user to change password on next login';
