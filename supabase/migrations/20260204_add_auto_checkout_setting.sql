-- Add auto_checkout_enabled column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auto_checkout_enabled BOOLEAN DEFAULT false;
