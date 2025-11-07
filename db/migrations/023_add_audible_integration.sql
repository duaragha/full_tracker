-- Migration: Add Audible Integration
-- Description: Adds tables and columns for Audible auto-tracking
-- Date: 2025-11-04

-- ============================================
-- AUDIBLE CONFIGURATION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS audible_config (
  id SERIAL PRIMARY KEY,
  user_id INTEGER DEFAULT 1, -- For future multi-user support

  -- Encrypted credentials (stored via Python service)
  email TEXT NOT NULL, -- Audible email
  country_code TEXT NOT NULL DEFAULT 'us', -- us, uk, de, fr, etc.

  -- Authentication tokens (encrypted)
  access_token TEXT, -- Encrypted Audible access token
  refresh_token TEXT, -- Encrypted refresh token
  device_serial TEXT, -- Encrypted device serial

  -- Token metadata
  token_expires_at TIMESTAMPTZ,
  last_auth_at TIMESTAMPTZ,

  -- Sync configuration
  enabled BOOLEAN DEFAULT true,
  auto_sync_progress BOOLEAN DEFAULT true, -- Auto-update reading progress
  sync_interval_minutes INTEGER DEFAULT 5, -- Default: sync every 5 minutes

  -- Rate limiting tracking
  last_sync_at TIMESTAMPTZ,
  sync_count_today INTEGER DEFAULT 0,
  last_sync_reset_date DATE DEFAULT CURRENT_DATE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT audible_config_user_unique UNIQUE(user_id),
  CONSTRAINT audible_config_interval_check CHECK (sync_interval_minutes >= 5) -- Min 5 min between syncs
);

-- Indexes for audible_config
CREATE INDEX IF NOT EXISTS idx_audible_config_user ON audible_config(user_id);
CREATE INDEX IF NOT EXISTS idx_audible_config_enabled ON audible_config(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_audible_config_last_sync ON audible_config(last_sync_at);

-- ============================================
-- AUDIBLE BOOK MAPPINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS audible_book_mappings (
  id SERIAL PRIMARY KEY,

  -- Audible identifiers
  asin TEXT NOT NULL, -- Audible Standard Item Number (unique book ID)
  audible_title TEXT NOT NULL,
  audible_author TEXT,
  audible_narrator TEXT,
  audible_runtime_minutes INTEGER, -- Total audiobook length
  audible_cover_url TEXT,
  audible_release_date DATE,

  -- Mapping to our tracker
  book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,

  -- Matching metadata
  match_confidence DECIMAL(3,2) CHECK (match_confidence >= 0 AND match_confidence <= 1), -- 0.00 to 1.00
  match_method TEXT CHECK (match_method IN ('isbn', 'title_author', 'manual')),
  manually_confirmed BOOLEAN DEFAULT false,

  -- Sync control
  sync_enabled BOOLEAN DEFAULT true,

  -- Last known Audible state
  last_known_position_seconds INTEGER DEFAULT 0,
  last_known_percentage INTEGER DEFAULT 0, -- 0-100
  audible_is_finished BOOLEAN DEFAULT false,
  last_synced_from_audible TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT audible_mappings_asin_unique UNIQUE(asin)
);

-- Indexes for audible_book_mappings
CREATE INDEX IF NOT EXISTS idx_audible_mappings_asin ON audible_book_mappings(asin);
CREATE INDEX IF NOT EXISTS idx_audible_mappings_book ON audible_book_mappings(book_id);
CREATE INDEX IF NOT EXISTS idx_audible_mappings_sync_enabled ON audible_book_mappings(sync_enabled) WHERE sync_enabled = true;
CREATE INDEX IF NOT EXISTS idx_audible_mappings_last_synced ON audible_book_mappings(last_synced_from_audible DESC);

-- ============================================
-- AUDIBLE SYNC LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS audible_sync_logs (
  id SERIAL PRIMARY KEY,

  -- Sync metadata
  sync_type TEXT NOT NULL CHECK (sync_type IN ('manual', 'scheduled', 'webhook')),
  trigger_source TEXT, -- 'user_action', 'cron_job', 'api_call'

  -- Results
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  books_synced INTEGER DEFAULT 0,
  books_updated INTEGER DEFAULT 0,
  books_failed INTEGER DEFAULT 0,

  -- Performance
  duration_ms INTEGER,
  api_calls_made INTEGER DEFAULT 0,

  -- Error tracking
  error_message TEXT,
  error_stack TEXT,

  -- Details (for debugging)
  sync_details JSONB, -- {"updated": [{"asin": "...", "title": "..."}], "errors": [...]}

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audible_sync_logs
CREATE INDEX IF NOT EXISTS idx_audible_sync_logs_created ON audible_sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audible_sync_logs_status ON audible_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_audible_sync_logs_sync_type ON audible_sync_logs(sync_type);

-- Partial index for failed syncs
CREATE INDEX IF NOT EXISTS idx_audible_sync_logs_failed ON audible_sync_logs(status, created_at DESC)
  WHERE status = 'failed';

-- ============================================
-- AUDIBLE CONFLICTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS audible_conflicts (
  id SERIAL PRIMARY KEY,

  -- Audible book info
  asin TEXT NOT NULL,
  audible_title TEXT NOT NULL,
  audible_author TEXT,

  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('multiple_matches', 'no_match', 'type_mismatch')),

  -- Potential matches stored as JSON array
  -- Format: [{"bookId": 1, "title": "...", "author": "...", "matchScore": 0.85}, ...]
  potential_matches JSONB DEFAULT '[]'::jsonb,

  -- Resolution
  resolved BOOLEAN DEFAULT false,
  resolved_book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
  resolved_at TIMESTAMPTZ,
  resolution_action TEXT CHECK (resolution_action IN ('user_selected', 'user_created_new', 'auto_resolved', 'ignored')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: only one unresolved conflict per ASIN
CREATE UNIQUE INDEX IF NOT EXISTS idx_audible_conflicts_unresolved_unique
  ON audible_conflicts(asin)
  WHERE resolved = false;

-- Index for unresolved conflicts
CREATE INDEX IF NOT EXISTS idx_audible_conflicts_unresolved ON audible_conflicts(resolved, created_at DESC)
  WHERE resolved = false;

-- ============================================
-- AUDIBLE PROGRESS HISTORY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS audible_progress_history (
  id SERIAL PRIMARY KEY,

  mapping_id INTEGER REFERENCES audible_book_mappings(id) ON DELETE CASCADE,
  asin TEXT NOT NULL,

  -- Progress snapshot
  position_seconds INTEGER NOT NULL,
  percentage INTEGER NOT NULL, -- 0-100
  is_finished BOOLEAN DEFAULT false,

  -- Context
  sync_log_id INTEGER REFERENCES audible_sync_logs(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audible_progress_history
CREATE INDEX IF NOT EXISTS idx_audible_progress_mapping ON audible_progress_history(mapping_id);
CREATE INDEX IF NOT EXISTS idx_audible_progress_asin ON audible_progress_history(asin);
CREATE INDEX IF NOT EXISTS idx_audible_progress_created ON audible_progress_history(created_at DESC);

-- ============================================
-- UPDATE EXISTING BOOKS TABLE
-- ============================================

-- Add columns to track Audible sync
ALTER TABLE books
  ADD COLUMN IF NOT EXISTS audible_synced BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS audible_last_sync TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS audible_asin TEXT;

-- Index for Audible-synced books
CREATE INDEX IF NOT EXISTS idx_books_audible_synced ON books(audible_synced) WHERE audible_synced = true;
CREATE INDEX IF NOT EXISTS idx_books_audible_asin ON books(audible_asin) WHERE audible_asin IS NOT NULL;

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Trigger for audible_config
DROP TRIGGER IF EXISTS update_audible_config_updated_at ON audible_config;
CREATE TRIGGER update_audible_config_updated_at
  BEFORE UPDATE ON audible_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for audible_book_mappings
DROP TRIGGER IF EXISTS update_audible_mappings_updated_at ON audible_book_mappings;
CREATE TRIGGER update_audible_mappings_updated_at
  BEFORE UPDATE ON audible_book_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for audible_conflicts
DROP TRIGGER IF EXISTS update_audible_conflicts_updated_at ON audible_conflicts;
CREATE TRIGGER update_audible_conflicts_updated_at
  BEFORE UPDATE ON audible_conflicts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to reset daily sync counter
CREATE OR REPLACE FUNCTION reset_audible_daily_sync_counter()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_sync_reset_date < CURRENT_DATE THEN
    NEW.sync_count_today = 0;
    NEW.last_sync_reset_date = CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-reset daily sync counter
DROP TRIGGER IF EXISTS reset_daily_sync_counter_trigger ON audible_config;
CREATE TRIGGER reset_daily_sync_counter_trigger
  BEFORE UPDATE ON audible_config
  FOR EACH ROW
  WHEN (OLD.last_sync_at IS DISTINCT FROM NEW.last_sync_at)
  EXECUTE FUNCTION reset_audible_daily_sync_counter();

-- ============================================
-- HELPER VIEWS
-- ============================================

-- View: Unmapped Audible books
CREATE OR REPLACE VIEW audible_unmapped_books AS
SELECT
  abm.id,
  abm.asin,
  abm.audible_title,
  abm.audible_author,
  abm.audible_runtime_minutes,
  abm.match_confidence,
  abm.match_method,
  abm.created_at
FROM audible_book_mappings abm
WHERE abm.book_id IS NULL
  AND abm.sync_enabled = true
ORDER BY abm.created_at DESC;

-- View: Recent sync activity summary
CREATE OR REPLACE VIEW audible_sync_activity AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_syncs,
  COUNT(*) FILTER (WHERE status = 'success') as successful,
  COUNT(*) FILTER (WHERE status = 'partial') as partial,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  SUM(books_synced) as total_books_synced,
  SUM(books_updated) as total_books_updated,
  AVG(duration_ms) as avg_duration_ms,
  SUM(api_calls_made) as total_api_calls
FROM audible_sync_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- View: Sync statistics
CREATE OR REPLACE VIEW audible_sync_stats AS
SELECT
  COUNT(*) as total_mappings,
  COUNT(*) FILTER (WHERE book_id IS NOT NULL) as mapped,
  COUNT(*) FILTER (WHERE book_id IS NULL) as unmapped,
  COUNT(*) FILTER (WHERE manually_confirmed = true) as manually_confirmed,
  COUNT(*) FILTER (WHERE match_confidence >= 0.90) as high_confidence,
  COUNT(*) FILTER (WHERE match_confidence < 0.90 AND match_confidence >= 0.70) as medium_confidence,
  COUNT(*) FILTER (WHERE match_confidence < 0.70) as low_confidence,
  COUNT(*) FILTER (WHERE sync_enabled = false) as sync_disabled,
  COUNT(*) FILTER (WHERE audible_is_finished = true) as finished_books,
  AVG(last_known_percentage) as avg_progress_percentage
FROM audible_book_mappings;

-- View: Currently reading audiobooks
CREATE OR REPLACE VIEW audible_currently_reading AS
SELECT
  abm.asin,
  abm.audible_title,
  abm.audible_author,
  abm.last_known_percentage as progress_percentage,
  abm.last_known_position_seconds,
  abm.audible_runtime_minutes,
  abm.last_synced_from_audible,
  b.id as book_id,
  b.title as tracker_title,
  b.status as tracker_status
FROM audible_book_mappings abm
LEFT JOIN books b ON b.id = abm.book_id
WHERE abm.last_known_percentage > 0
  AND abm.last_known_percentage < 100
  AND abm.audible_is_finished = false
ORDER BY abm.last_synced_from_audible DESC;

-- ============================================
-- CLEANUP FUNCTIONS
-- ============================================

-- Function to clean old sync logs (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_audible_sync_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audible_sync_logs
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND status NOT IN ('failed'); -- Keep failed logs for debugging

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean old progress history (keep last 100 per book)
CREATE OR REPLACE FUNCTION cleanup_old_audible_progress()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH ranked_progress AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY mapping_id ORDER BY created_at DESC) as rn
    FROM audible_progress_history
  )
  DELETE FROM audible_progress_history
  WHERE id IN (
    SELECT id FROM ranked_progress WHERE rn > 100
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RATE LIMITING HELPER FUNCTION
-- ============================================

-- Function to check if sync is allowed (rate limiting)
CREATE OR REPLACE FUNCTION audible_can_sync()
RETURNS TABLE (
  can_sync BOOLEAN,
  reason TEXT,
  next_allowed_sync TIMESTAMPTZ,
  syncs_remaining_today INTEGER
) AS $$
DECLARE
  config_record RECORD;
  max_syncs_per_day INTEGER := 600; -- 10 requests/min * 60 min = 600/hour
  min_interval_seconds INTEGER;
BEGIN
  -- Get config
  SELECT * INTO config_record FROM audible_config WHERE user_id = 1 LIMIT 1;

  IF config_record IS NULL THEN
    RETURN QUERY SELECT false, 'No Audible configuration found', NULL::TIMESTAMPTZ, 0;
    RETURN;
  END IF;

  IF NOT config_record.enabled THEN
    RETURN QUERY SELECT false, 'Audible sync is disabled', NULL::TIMESTAMPTZ, 0;
    RETURN;
  END IF;

  min_interval_seconds := config_record.sync_interval_minutes * 60;

  -- Check daily limit
  IF config_record.sync_count_today >= max_syncs_per_day THEN
    RETURN QUERY SELECT
      false,
      'Daily sync limit reached',
      (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ,
      0;
    RETURN;
  END IF;

  -- Check minimum interval
  IF config_record.last_sync_at IS NOT NULL THEN
    IF EXTRACT(EPOCH FROM (NOW() - config_record.last_sync_at)) < min_interval_seconds THEN
      RETURN QUERY SELECT
        false,
        'Minimum interval not met',
        config_record.last_sync_at + (min_interval_seconds || ' seconds')::INTERVAL,
        max_syncs_per_day - config_record.sync_count_today;
      RETURN;
    END IF;
  END IF;

  -- Sync is allowed
  RETURN QUERY SELECT
    true,
    'Sync allowed',
    NOW(),
    max_syncs_per_day - config_record.sync_count_today;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE audible_config IS 'Stores Audible configuration including encrypted credentials';
COMMENT ON TABLE audible_book_mappings IS 'Maps Audible audiobooks to tracker books';
COMMENT ON TABLE audible_sync_logs IS 'Audit log of all Audible sync operations';
COMMENT ON TABLE audible_conflicts IS 'Tracks books that need manual matching resolution';
COMMENT ON TABLE audible_progress_history IS 'Historical progress snapshots for audiobooks';

COMMENT ON COLUMN audible_config.access_token IS 'Encrypted Audible API access token';
COMMENT ON COLUMN audible_config.sync_interval_minutes IS 'Minimum minutes between syncs (default: 60)';
COMMENT ON COLUMN audible_book_mappings.asin IS 'Audible Standard Item Number - unique book identifier';
COMMENT ON COLUMN audible_book_mappings.match_confidence IS 'Confidence score from 0.00 to 1.00';
COMMENT ON COLUMN audible_sync_logs.sync_details IS 'JSON details of books updated/failed during sync';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Audible integration tables created successfully';
  RAISE NOTICE 'Tables: audible_config, audible_book_mappings, audible_sync_logs, audible_conflicts, audible_progress_history';
  RAISE NOTICE 'Views: audible_unmapped_books, audible_sync_activity, audible_sync_stats, audible_currently_reading';
  RAISE NOTICE 'Run SELECT * FROM audible_sync_stats; to see sync statistics';
  RAISE NOTICE 'Run SELECT * FROM audible_can_sync(); to check if sync is currently allowed';
END $$;
