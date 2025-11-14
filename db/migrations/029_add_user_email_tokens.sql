-- ============================================
-- Email-to-Reader System
-- Migration: Add user management and email tokens
-- Date: 2025-11-13
-- ============================================
--
-- This migration creates:
-- - Users table for authentication
-- - Email tokens for email-to-reader functionality
-- - Email import logs for tracking
--
-- ============================================

-- Users Table: Core user management
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,

  -- User identification
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT,

  -- Email-to-reader configuration
  email_token TEXT UNIQUE,
  email_enabled BOOLEAN DEFAULT TRUE,

  -- User preferences
  default_collection_id INTEGER,
  default_tags TEXT[],

  -- Settings
  settings JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Email Import Logs: Track email-to-reader imports
CREATE TABLE IF NOT EXISTS email_import_logs (
  id SERIAL PRIMARY KEY,

  -- User reference (optional for now, can be null if no user system)
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

  -- Email metadata
  email_token TEXT NOT NULL,
  from_address TEXT NOT NULL,
  subject TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW(),

  -- Import results
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  urls_found INTEGER DEFAULT 0,
  articles_imported INTEGER DEFAULT 0,

  -- Import details
  source_ids INTEGER[],
  error_message TEXT,

  -- Email content (for debugging/reference)
  email_body_preview TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email_token ON users(email_token) WHERE email_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email_enabled ON users(email_enabled) WHERE email_enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_email_import_logs_user_id ON email_import_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_import_logs_email_token ON email_import_logs(email_token);
CREATE INDEX IF NOT EXISTS idx_email_import_logs_status ON email_import_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_import_logs_received_at ON email_import_logs(received_at DESC);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update users.updated_at on change
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();

-- ============================================
-- FUNCTIONS
-- ============================================

-- Generate unique email token for users
CREATE OR REPLACE FUNCTION generate_email_token()
RETURNS TEXT AS $$
DECLARE
  new_token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random 12-character alphanumeric token
    new_token := encode(gen_random_bytes(9), 'hex');

    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM users WHERE email_token = new_token) INTO token_exists;

    -- Exit loop if token is unique
    EXIT WHEN NOT token_exists;
  END LOOP;

  RETURN new_token;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TABLE COMMENTS
-- ============================================

COMMENT ON TABLE users IS 'User accounts with email-to-reader tokens';
COMMENT ON TABLE email_import_logs IS 'Track all email-to-reader import attempts';

COMMENT ON COLUMN users.email_token IS 'Unique token for email-to-reader functionality (e.g., username-token@reader.domain.com)';
COMMENT ON COLUMN users.email_enabled IS 'Whether email-to-reader is enabled for this user';

COMMENT ON COLUMN email_import_logs.email_token IS 'Token extracted from recipient address';
COMMENT ON COLUMN email_import_logs.source_ids IS 'Array of source IDs created from this email';

-- ============================================
-- SEED DATA (Optional - for development)
-- ============================================

-- Create a default user for testing (can be removed in production)
DO $$
DECLARE
  test_user_id INTEGER;
BEGIN
  -- Only insert if users table is empty
  IF NOT EXISTS (SELECT 1 FROM users LIMIT 1) THEN
    INSERT INTO users (email, username, full_name, email_token, email_enabled)
    VALUES ('test@example.com', 'testuser', 'Test User', generate_email_token(), TRUE)
    RETURNING id INTO test_user_id;

    RAISE NOTICE 'Created test user with ID: %, email token: %', test_user_id, (SELECT email_token FROM users WHERE id = test_user_id);
  END IF;
END $$;

-- ============================================
-- ANALYZE
-- ============================================

ANALYZE users;
ANALYZE email_import_logs;
