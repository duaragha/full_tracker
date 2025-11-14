-- ============================================
-- Amazon Kindle Credentials Storage
-- Migration: Create tables for storing encrypted Amazon credentials
-- Date: 2025-11-12
-- ============================================

-- Amazon Credentials: Securely store encrypted login credentials
CREATE TABLE IF NOT EXISTS amazon_credentials (
  id SERIAL PRIMARY KEY,

  -- Encrypted credentials
  encrypted_email TEXT NOT NULL,
  encrypted_password TEXT NOT NULL,
  iv TEXT NOT NULL,  -- Initialization vector for encryption

  -- Optional user association (nullable for now, can be used later for multi-user support)
  user_id INTEGER,

  -- Sync tracking
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT CHECK (last_sync_status IN ('success', 'failed', 'in_progress', null)),
  last_sync_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure only one credential set per user (or one global if user_id is null)
  CONSTRAINT unique_user_credentials UNIQUE NULLS NOT DISTINCT (user_id)
);

-- Sync Logs: Track all sync attempts with detailed information
CREATE TABLE IF NOT EXISTS kindle_sync_logs (
  id SERIAL PRIMARY KEY,

  -- Sync details
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial', 'in_progress')),

  -- Statistics
  highlights_imported INTEGER DEFAULT 0,
  sources_created INTEGER DEFAULT 0,
  duplicates_skipped INTEGER DEFAULT 0,

  -- Error information
  error_message TEXT,
  error_details JSONB DEFAULT '{}'::jsonb,

  -- Books synced
  books_processed JSONB DEFAULT '[]'::jsonb,
  -- Format: [{"title": "Book Title", "author": "Author", "highlightsCount": 10}]

  -- Performance tracking
  duration_seconds INTEGER,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Sync logs indexes
CREATE INDEX IF NOT EXISTS idx_kindle_sync_logs_status ON kindle_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_kindle_sync_logs_started_at ON kindle_sync_logs(started_at DESC);

-- ============================================
-- TRIGGERS FOR AUTO-UPDATE
-- ============================================

-- Update amazon_credentials.updated_at on change
CREATE OR REPLACE FUNCTION update_amazon_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_amazon_credentials_updated_at ON amazon_credentials;
CREATE TRIGGER trigger_amazon_credentials_updated_at
  BEFORE UPDATE ON amazon_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_amazon_credentials_updated_at();

-- ============================================
-- TABLE COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE amazon_credentials IS 'Encrypted Amazon credentials for Kindle highlights sync';
COMMENT ON TABLE kindle_sync_logs IS 'Historical log of all Kindle sync attempts';

COMMENT ON COLUMN amazon_credentials.encrypted_email IS 'AES-256-GCM encrypted email address';
COMMENT ON COLUMN amazon_credentials.encrypted_password IS 'AES-256-GCM encrypted password';
COMMENT ON COLUMN amazon_credentials.iv IS 'Initialization vector for decryption';
COMMENT ON COLUMN kindle_sync_logs.books_processed IS 'JSON array of books processed during sync';

-- ============================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================

ANALYZE amazon_credentials;
ANALYZE kindle_sync_logs;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
