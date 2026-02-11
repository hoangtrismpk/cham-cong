ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contract_type text DEFAULT 'Full-time';

COMMENT ON COLUMN profiles.contract_type IS 'Type of employment contract (Full-time, Part-time, Intern, etc.)';
