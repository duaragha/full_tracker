-- Migration 027: Add reader fields to sources table for in-app reading
-- Note: saved_articles table already has most fields we need
-- This migration adds reader-specific fields to sources table for unified access

-- Add fields for storing full content for in-app reading
ALTER TABLE sources
ADD COLUMN IF NOT EXISTS full_content TEXT,                    -- Full HTML/text content for reading
ADD COLUMN IF NOT EXISTS full_content_html TEXT,               -- Original HTML if needed
ADD COLUMN IF NOT EXISTS word_count INTEGER,                   -- Calculate word count
ADD COLUMN IF NOT EXISTS reading_time_minutes INTEGER,         -- Estimated reading time (200 wpm)
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE,        -- Mark as read
ADD COLUMN IF NOT EXISTS reading_position INTEGER DEFAULT 0,   -- Track scroll position (0-100 percentage)
ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ;            -- Last reading session

-- Add index for reader queries
CREATE INDEX IF NOT EXISTS idx_sources_is_read ON sources(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_sources_last_read ON sources(last_read_at DESC NULLS LAST);

-- Add reading sessions tracking table
CREATE TABLE IF NOT EXISTS reading_sessions (
  id SERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  reading_position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reading_sessions_source_id ON reading_sessions(source_id, started_at DESC);

-- Update sources table to handle file storage for PDFs/EPUBs
ALTER TABLE sources
ADD COLUMN IF NOT EXISTS file_storage_path TEXT,  -- Path to uploaded file in storage
ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,  -- File size for display
ADD COLUMN IF NOT EXISTS file_hash TEXT;          -- SHA256 for deduplication

-- Add index for file hash lookups (deduplication)
CREATE INDEX IF NOT EXISTS idx_sources_file_hash ON sources(file_hash) WHERE file_hash IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN sources.full_content IS 'Cleaned text content for reading (extracted from HTML/PDF/EPUB)';
COMMENT ON COLUMN sources.full_content_html IS 'Original HTML with formatting preserved';
COMMENT ON COLUMN sources.reading_position IS 'Reading progress as percentage (0-100) or scroll offset';
COMMENT ON COLUMN sources.file_storage_path IS 'Storage path for uploaded PDFs/EPUBs relative to uploads directory';
COMMENT ON COLUMN sources.file_hash IS 'SHA256 hash of file content for deduplication';
COMMENT ON TABLE reading_sessions IS 'Track reading sessions for analytics and progress';

-- Update existing source_type enum to include more reader types if needed
-- Current types: 'book', 'article', 'pdf', 'web', 'podcast', 'video', 'kindle'
-- No changes needed - existing types cover our use cases
