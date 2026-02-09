-- =====================================================
-- FIX: Add email column to profiles and sync with auth.users
-- Created: 2026-02-05
-- =====================================================

-- 1. Add email column to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email TEXT;
  END IF;
END $$;

-- 2. Create index on email for faster search
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 3. Backfill email data from auth.users (One-time sync)
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id;

-- 4. Create trigger function to keep email in sync
CREATE OR REPLACE FUNCTION public.handle_user_email_sync() 
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.profiles 
    SET email = NEW.email 
    WHERE id = NEW.id;
  -- On UPDATE
  ELSIF (TG_OP = 'UPDATE' AND OLD.email <> NEW.email) THEN
    UPDATE public.profiles 
    SET email = NEW.email 
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Attach trigger to auth.users (Requires superuser/admin privileges)
-- Note: In Supabase dashboard SQL Editor, you have sufficient permissions
DROP TRIGGER IF EXISTS on_auth_user_email_sync ON auth.users;
CREATE TRIGGER on_auth_user_email_sync
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_sync();

-- 6. Grant read access to internal authenticated users if needed
-- (Usually handled by RLS, but ensuring column visibility)
GRANT SELECT(email) ON profiles TO authenticated;
GRANT SELECT(email) ON profiles TO service_role;
