-- ============================================
-- Export Credentials and OAuth Storage
-- Migration: Add storage for OAuth tokens and export settings
-- Date: 2025-11-12
-- ============================================

-- OAuth Credentials: Store OAuth tokens for export integrations
CREATE TABLE IF NOT EXISTS export_credentials (
  id SERIAL PRIMARY KEY,

  -- Export provider
  provider TEXT NOT NULL CHECK (provider IN ('onenote', 'notion', 'evernote', 'google_drive', 'dropbox')),

  -- OAuth tokens
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,

  -- Provider-specific user info
  user_id TEXT,                   -- Provider's user ID
  user_email TEXT,
  user_name TEXT,

  -- Scopes granted
  scopes TEXT[],

  -- Configuration
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Only one active credential per provider
  CONSTRAINT unique_active_provider UNIQUE (provider) WHERE is_active = TRUE
);

-- Export Jobs: Track export operations
CREATE TABLE IF NOT EXISTS export_jobs (
  id SERIAL PRIMARY KEY,

  -- Job details
  export_type TEXT NOT NULL CHECK (export_type IN ('onenote', 'notion', 'markdown', 'json', 'csv', 'pdf')),
  format TEXT,                    -- Additional format specifier (e.g., 'grouped_by_source', 'single_file')

  -- Export scope
  highlight_ids INTEGER[],        -- Specific highlights to export (null = all)
  source_ids INTEGER[],           -- Specific sources to export (null = all)
  tag_filter TEXT[],              -- Filter by tags

  -- Results
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  items_processed INTEGER DEFAULT 0,
  items_exported INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,

  -- Output
  output_path TEXT,               -- Local file path or download URL
  output_size_bytes BIGINT,

  -- Error tracking
  error_message TEXT,
  error_details JSONB,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_export_credentials_provider ON export_credentials(provider);
CREATE INDEX IF NOT EXISTS idx_export_credentials_active ON export_credentials(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_export_credentials_expires_at ON export_credentials(expires_at);

CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_export_jobs_type ON export_jobs(export_type);
CREATE INDEX IF NOT EXISTS idx_export_jobs_created_at ON export_jobs(created_at DESC);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update export_credentials.updated_at on change
CREATE OR REPLACE FUNCTION update_export_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_export_credentials_updated_at ON export_credentials;
CREATE TRIGGER trigger_export_credentials_updated_at
  BEFORE UPDATE ON export_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_export_credentials_updated_at();

-- ============================================
-- TABLE COMMENTS
-- ============================================

COMMENT ON TABLE export_credentials IS 'OAuth credentials for export integrations (OneNote, Notion, etc.)';
COMMENT ON TABLE export_jobs IS 'Track export operations and their results';

COMMENT ON COLUMN export_credentials.access_token IS 'OAuth access token (encrypted in production)';
COMMENT ON COLUMN export_credentials.refresh_token IS 'OAuth refresh token (encrypted in production)';
COMMENT ON COLUMN export_credentials.expires_at IS 'When the access token expires';

-- ============================================
-- ANALYZE
-- ============================================

ANALYZE export_credentials;
ANALYZE export_jobs;
