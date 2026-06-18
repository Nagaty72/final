-- ============================================================
-- MIGRATION: Add is_verified field to users table
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Existing users (created before OTP flow) should be marked verified
-- so they are not locked out. Adjust this if you want to re-verify everyone.
UPDATE users SET is_verified = TRUE WHERE is_verified = FALSE;

-- Confirm result
SELECT id, email, is_verified FROM users LIMIT 10;
