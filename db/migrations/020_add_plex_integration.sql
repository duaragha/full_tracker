-- Migration: Add Plex Integration
-- Description: Adds tables and columns for Plex API integration
-- Date: 2025-11-02

-- ============================================
-- EXTENSIONS
-- ============================================

-- Enable trigram extension for fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- PLEX CONFIGURATION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS plex_config (
  id SERIAL PRIMARY KEY,
  user_id INTEGER DEFAULT 1, -- For future multi-user support
  plex_token TEXT NOT NULL, -- Encrypted Plex token
  plex_server_url TEXT, -- e.g., http://192.168.1.100:32400
  plex_server_name TEXT,
  plex_server_uuid TEXT,
  webhook_secret TEXT NOT NULL, -- For webhook verification
  enabled BOOLEAN DEFAULT true,
  auto_add_shows BOOLEAN DEFAULT true, -- Auto-add new shows from Plex
  auto_mark_watched BOOLEAN DEFAULT true, -- Auto-mark episodes as watched
  sync_started_date TIMESTAMPTZ DEFAULT NOW(),
  last_webhook_received TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT plex_config_user_unique UNIQUE(user_id)
);

-- Indexes for plex_config
CREATE INDEX IF NOT EXISTS idx_plex_config_user ON plex_config(user_id);
CREATE INDEX IF NOT EXISTS idx_plex_config_enabled ON plex_config(enabled) WHERE enabled = true;

-- ============================================
-- PLEX SHOW MAPPINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS plex_show_mappings (
  id SERIAL PRIMARY KEY,
  plex_rating_key TEXT NOT NULL, -- Plex's internal show ID
  plex_guid TEXT NOT NULL, -- e.g., plex://show/5d776b59ad5437001f79c6f8
  plex_title TEXT NOT NULL,
  plex_year INTEGER,

  -- External IDs extracted from Plex guid
  tvdb_id INTEGER,
  imdb_id TEXT,
  tmdb_id INTEGER,

  -- Mapping to our tracker
  tvshow_id INTEGER REFERENCES tvshows(id) ON DELETE CASCADE,

  -- Matching metadata
  match_confidence DECIMAL(3,2) CHECK (match_confidence >= 0 AND match_confidence <= 1), -- 0.00 to 1.00
  match_method TEXT CHECK (match_method IN ('tmdb_id', 'tvdb_id', 'imdb_id', 'title_year')),
  manually_confirmed BOOLEAN DEFAULT false,

  -- Sync control
  sync_enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT plex_mappings_rating_key_unique UNIQUE(plex_rating_key),
  CONSTRAINT plex_mappings_guid_unique UNIQUE(plex_guid)
);

-- Indexes for plex_show_mappings
CREATE INDEX IF NOT EXISTS idx_plex_mappings_rating_key ON plex_show_mappings(plex_rating_key);
CREATE INDEX IF NOT EXISTS idx_plex_mappings_tvshow ON plex_show_mappings(tvshow_id);
CREATE INDEX IF NOT EXISTS idx_plex_mappings_tmdb ON plex_show_mappings(tmdb_id) WHERE tmdb_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plex_mappings_tvdb ON plex_show_mappings(tvdb_id) WHERE tvdb_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plex_mappings_imdb ON plex_show_mappings(imdb_id) WHERE imdb_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plex_mappings_sync_enabled ON plex_show_mappings(sync_enabled) WHERE sync_enabled = true;

-- ============================================
-- PLEX WEBHOOK LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS plex_webhook_logs (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'media.scrobble', 'media.play', etc.
  plex_rating_key TEXT,
  plex_title TEXT,
  plex_season INTEGER,
  plex_episode INTEGER,

  payload JSONB NOT NULL, -- Full webhook payload for debugging

  -- Processing status
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'ignored', 'duplicate')),
  error_message TEXT,
  processing_duration_ms INTEGER,

  -- Resulting action
  action_taken TEXT, -- 'marked_watched', 'auto_added_show', 'needs_user_input', 'ignored'
  tvshow_id INTEGER REFERENCES tvshows(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for plex_webhook_logs
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON plex_webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON plex_webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_rating_key ON plex_webhook_logs(plex_rating_key);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON plex_webhook_logs(event_type);

-- Partial index for failed events needing review
CREATE INDEX IF NOT EXISTS idx_webhook_logs_failed ON plex_webhook_logs(status, created_at DESC)
  WHERE status = 'failed';

-- Index for deduplication query (recent events)
CREATE INDEX IF NOT EXISTS idx_webhook_logs_dedup ON plex_webhook_logs(plex_rating_key, event_type, created_at DESC);

-- ============================================
-- PLEX CONFLICTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS plex_conflicts (
  id SERIAL PRIMARY KEY,
  plex_rating_key TEXT NOT NULL,
  plex_guid TEXT NOT NULL,
  plex_title TEXT NOT NULL,
  plex_year INTEGER,

  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('multiple_matches', 'no_match', 'ambiguous')),

  -- Potential matches stored as JSON array
  -- Format: [{"tvshowId": 1, "title": "Show", "tmdbId": 123, "matchScore": 0.85}, ...]
  potential_matches JSONB DEFAULT '[]'::jsonb,

  -- Resolution
  resolved BOOLEAN DEFAULT false,
  resolved_tvshow_id INTEGER REFERENCES tvshows(id) ON DELETE CASCADE,
  resolved_at TIMESTAMPTZ,
  resolution_action TEXT CHECK (resolution_action IN ('user_selected', 'user_created_new', 'auto_resolved', 'ignored')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: only one unresolved conflict per Plex show
CREATE UNIQUE INDEX IF NOT EXISTS idx_plex_conflicts_unresolved_unique
  ON plex_conflicts(plex_rating_key)
  WHERE resolved = false;

-- Index for unresolved conflicts
CREATE INDEX IF NOT EXISTS idx_plex_conflicts_unresolved ON plex_conflicts(resolved, created_at DESC)
  WHERE resolved = false;

-- Index for resolved conflicts
CREATE INDEX IF NOT EXISTS idx_plex_conflicts_resolved ON plex_conflicts(resolved, resolved_at DESC)
  WHERE resolved = true;

-- ============================================
-- UPDATE EXISTING TVSHOWS TABLE
-- ============================================

-- Add columns to track Plex sync source
ALTER TABLE tvshows
  ADD COLUMN IF NOT EXISTS plex_synced BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS plex_last_sync TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'plex', 'import'));

-- Index for Plex-synced shows
CREATE INDEX IF NOT EXISTS idx_tvshows_plex_synced ON tvshows(plex_synced) WHERE plex_synced = true;
CREATE INDEX IF NOT EXISTS idx_tvshows_source ON tvshows(source);

-- Add trigram index for fuzzy title matching
CREATE INDEX IF NOT EXISTS idx_tvshows_title_trgm ON tvshows USING gin(title gin_trgm_ops);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for plex_config
DROP TRIGGER IF EXISTS update_plex_config_updated_at ON plex_config;
CREATE TRIGGER update_plex_config_updated_at
  BEFORE UPDATE ON plex_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for plex_show_mappings
DROP TRIGGER IF EXISTS update_plex_mappings_updated_at ON plex_show_mappings;
CREATE TRIGGER update_plex_mappings_updated_at
  BEFORE UPDATE ON plex_show_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for plex_conflicts
DROP TRIGGER IF EXISTS update_plex_conflicts_updated_at ON plex_conflicts;
CREATE TRIGGER update_plex_conflicts_updated_at
  BEFORE UPDATE ON plex_conflicts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER VIEWS
-- ============================================

-- View: Unmapped Plex shows (shows in Plex but not in tracker)
CREATE OR REPLACE VIEW plex_unmapped_shows AS
SELECT
  psm.id,
  psm.plex_rating_key,
  psm.plex_title,
  psm.plex_year,
  psm.match_confidence,
  psm.match_method,
  psm.created_at
FROM plex_show_mappings psm
WHERE psm.tvshow_id IS NULL
  AND psm.sync_enabled = true
ORDER BY psm.created_at DESC;

-- View: Recent webhook activity summary
CREATE OR REPLACE VIEW plex_webhook_activity AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_webhooks,
  COUNT(*) FILTER (WHERE status = 'success') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE status = 'ignored') as ignored,
  COUNT(*) FILTER (WHERE status = 'duplicate') as duplicates,
  AVG(processing_duration_ms) as avg_duration_ms,
  MAX(processing_duration_ms) as max_duration_ms
FROM plex_webhook_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- View: Sync statistics
CREATE OR REPLACE VIEW plex_sync_stats AS
SELECT
  COUNT(*) as total_mappings,
  COUNT(*) FILTER (WHERE tvshow_id IS NOT NULL) as mapped,
  COUNT(*) FILTER (WHERE tvshow_id IS NULL) as unmapped,
  COUNT(*) FILTER (WHERE manually_confirmed = true) as manually_confirmed,
  COUNT(*) FILTER (WHERE match_confidence >= 0.90) as high_confidence,
  COUNT(*) FILTER (WHERE match_confidence < 0.90 AND match_confidence >= 0.70) as medium_confidence,
  COUNT(*) FILTER (WHERE match_confidence < 0.70) as low_confidence,
  COUNT(*) FILTER (WHERE sync_enabled = false) as sync_disabled
FROM plex_show_mappings;

-- ============================================
-- CLEANUP FUNCTIONS
-- ============================================

-- Function to clean old webhook logs (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM plex_webhook_logs
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND status NOT IN ('failed'); -- Keep failed logs for debugging

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE plex_config IS 'Stores user Plex configuration including encrypted token';
COMMENT ON TABLE plex_show_mappings IS 'Maps Plex shows to tracker shows with matching metadata';
COMMENT ON TABLE plex_webhook_logs IS 'Audit log of all Plex webhook events';
COMMENT ON TABLE plex_conflicts IS 'Tracks shows that need manual matching resolution';

COMMENT ON COLUMN plex_config.plex_token IS 'Encrypted Plex authentication token';
COMMENT ON COLUMN plex_config.webhook_secret IS 'Secret for webhook URL verification';
COMMENT ON COLUMN plex_show_mappings.match_confidence IS 'Confidence score from 0.00 to 1.00';
COMMENT ON COLUMN plex_show_mappings.match_method IS 'Method used for matching: tmdb_id, tvdb_id, imdb_id, or title_year';
COMMENT ON COLUMN plex_webhook_logs.payload IS 'Full webhook payload as JSON for debugging';
COMMENT ON COLUMN plex_conflicts.potential_matches IS 'Array of potential show matches with scores';

-- ============================================
-- VERIFICATION
-- ============================================

-- Display table info
DO $$
BEGIN
  RAISE NOTICE 'Plex integration tables created successfully';
  RAISE NOTICE 'Tables: plex_config, plex_show_mappings, plex_webhook_logs, plex_conflicts';
  RAISE NOTICE 'Views: plex_unmapped_shows, plex_webhook_activity, plex_sync_stats';
  RAISE NOTICE 'Run SELECT * FROM plex_sync_stats; to see sync statistics';
END $$;
