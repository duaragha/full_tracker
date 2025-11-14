-- ============================================
-- Kindle Sync Settings
-- Migration: Add table for storing Amazon Kindle sync configuration
-- Date: 2025-11-12
-- ============================================

-- Kindle Sync Settings: Store Amazon credentials and sync preferences
CREATE TABLE IF NOT EXISTS kindle_sync_settings (
  id SERIAL PRIMARY KEY,

  -- Amazon credentials (should be encrypted in production)
  amazon_email TEXT,
  amazon_password_encrypted TEXT,  -- Store encrypted password

  -- Sync settings
  auto_sync_enabled BOOLEAN DEFAULT FALSE,
  sync_frequency TEXT DEFAULT 'manual' CHECK (sync_frequency IN ('manual', 'hourly', '6hours', 'daily', 'weekly')),

  -- Last sync tracking
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT CHECK (last_sync_status IN ('success', 'failed', 'in_progress', 'never')),
  last_sync_error TEXT,
  last_sync_highlights_count INTEGER DEFAULT 0,
  last_sync_new_highlights_count INTEGER DEFAULT 0,
  last_sync_new_books_count INTEGER DEFAULT 0,

  -- Connection status
  is_connected BOOLEAN DEFAULT FALSE,
  connection_verified_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kindle Sync History: Track sync operations
CREATE TABLE IF NOT EXISTS kindle_sync_history (
  id SERIAL PRIMARY KEY,

  -- Sync details
  sync_type TEXT NOT NULL CHECK (sync_type IN ('manual', 'automatic', 'scheduled')),

  -- Results
  highlights_processed INTEGER DEFAULT 0,
  highlights_imported INTEGER DEFAULT 0,
  highlights_skipped INTEGER DEFAULT 0,
  books_created INTEGER DEFAULT 0,

  -- Status
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  error_message TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kindle_sync_settings_last_sync ON kindle_sync_settings(last_sync_at DESC);
CREATE INDEX IF NOT EXISTS idx_kindle_sync_settings_auto_sync ON kindle_sync_settings(auto_sync_enabled) WHERE auto_sync_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_kindle_sync_history_status ON kindle_sync_history(status);
CREATE INDEX IF NOT EXISTS idx_kindle_sync_history_started_at ON kindle_sync_history(started_at DESC);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_kindle_sync_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_kindle_sync_settings_updated_at ON kindle_sync_settings;
CREATE TRIGGER trigger_kindle_sync_settings_updated_at
  BEFORE UPDATE ON kindle_sync_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_kindle_sync_settings_updated_at();

-- Comments
COMMENT ON TABLE kindle_sync_settings IS 'Amazon Kindle sync configuration and credentials';
COMMENT ON TABLE kindle_sync_history IS 'Historical record of Kindle sync operations';
COMMENT ON COLUMN kindle_sync_settings.amazon_password_encrypted IS 'Encrypted Amazon password (use crypto library)';
COMMENT ON COLUMN kindle_sync_settings.sync_frequency IS 'How often to automatically sync: manual, hourly, 6hours, daily, weekly';

-- Analyze tables
ANALYZE kindle_sync_settings;
ANALYZE kindle_sync_history;
