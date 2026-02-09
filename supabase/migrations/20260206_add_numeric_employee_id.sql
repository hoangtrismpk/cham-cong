-- Add numeric employee ID with auto-increment starting from 100000
-- This creates a shorter, more user-friendly ID for URLs

-- Create sequence starting at 100000
CREATE SEQUENCE IF NOT EXISTS employee_numeric_id_seq
    START WITH 100000
    INCREMENT BY 1
    NO MAXVALUE
    NO MINVALUE
    CACHE 1;

-- Add numeric_id column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS numeric_id INTEGER UNIQUE NOT NULL DEFAULT nextval('employee_numeric_id_seq');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_numeric_id ON profiles(numeric_id);

-- Update existing employees with numeric IDs (if any exist)
-- This will assign sequential IDs starting from 100000 to existing employees
DO $$
DECLARE
    emp_record RECORD;
    counter INTEGER := 100000;
BEGIN
    FOR emp_record IN 
        SELECT id FROM profiles WHERE numeric_id IS NULL ORDER BY created_at
    LOOP
        UPDATE profiles 
        SET numeric_id = counter 
        WHERE id = emp_record.id;
        counter := counter + 1;
    END LOOP;
    
    -- Update sequence to continue from the last assigned ID
    PERFORM setval('employee_numeric_id_seq', counter, false);
END $$;

-- Add comment for documentation
COMMENT ON COLUMN profiles.numeric_id IS 'Auto-incrementing numeric employee ID starting from 100000';
