-- Migration: Add missing fields to movies and tvshows tables
-- This migration adds fields that are defined in TypeScript types but missing from database schema
-- Date: 2025-10-16

-- ============================================
-- MOVIES TABLE UPDATES
-- ============================================

-- Add missing movie fields
ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS director TEXT DEFAULT 'Unknown',
  ADD COLUMN IF NOT EXISTS release_date DATE,
  ADD COLUMN IF NOT EXISTS watchlist_added_date DATE;

-- Update release_date from release_year where possible
-- This creates a date as January 1st of the release year
UPDATE movies
SET release_date = make_date(release_year, 1, 1)
WHERE release_year IS NOT NULL AND release_date IS NULL;

-- ============================================
-- TV SHOWS TABLE UPDATES
-- ============================================

-- Add missing tvshow fields
ALTER TABLE tvshows
  ADD COLUMN IF NOT EXISTS creators TEXT[], -- Array of creator names
  ADD COLUMN IF NOT EXISTS network TEXT,
  ADD COLUMN IF NOT EXISTS genres TEXT[], -- Array of genre names
  ADD COLUMN IF NOT EXISTS backdrop_image TEXT,
  ADD COLUMN IF NOT EXISTS show_start_date DATE,
  ADD COLUMN IF NOT EXISTS show_end_date DATE,
  ADD COLUMN IF NOT EXISTS date_i_started DATE,
  ADD COLUMN IF NOT EXISTS date_i_ended DATE,
  ADD COLUMN IF NOT EXISTS total_episodes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS watched_episodes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seasons JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS total_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS days_tracking INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rewatch_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rewatch_history JSONB DEFAULT '[]'::jsonb;

-- ============================================
-- DATA MIGRATION
-- ============================================

-- Migrate existing started_date to date_i_started
UPDATE tvshows
SET date_i_started = started_date
WHERE started_date IS NOT NULL AND date_i_started IS NULL;

-- Migrate existing completed_date to date_i_ended
UPDATE tvshows
SET date_i_ended = completed_date
WHERE completed_date IS NOT NULL AND date_i_ended IS NULL;

-- Migrate existing genre string to genres array for movies (if needed)
-- This assumes genres are currently stored as comma-separated strings
-- Uncomment if you want to convert existing data:
-- UPDATE movies
-- SET genres = string_to_array(genre, ',')
-- WHERE genre IS NOT NULL;

-- Note: The 'genre' column is kept for backward compatibility
-- The TypeScript code normalizes it to 'genres' array on read

-- ============================================
-- INDEXES FOR NEW FIELDS
-- ============================================

-- Index on release_date for movies sorting/filtering
CREATE INDEX IF NOT EXISTS idx_movies_release_date ON movies(release_date DESC);

-- Index on director for movies filtering
CREATE INDEX IF NOT EXISTS idx_movies_director ON movies(director);

-- Index on network for tvshows filtering
CREATE INDEX IF NOT EXISTS idx_tvshows_network ON tvshows(network);

-- GIN index for array fields (genres, creators) for efficient searching
CREATE INDEX IF NOT EXISTS idx_tvshows_genres ON tvshows USING gin(genres);
CREATE INDEX IF NOT EXISTS idx_tvshows_creators ON tvshows USING gin(creators);

-- Index on show date fields for sorting
CREATE INDEX IF NOT EXISTS idx_tvshows_show_start_date ON tvshows(show_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_tvshows_date_i_started ON tvshows(date_i_started DESC);

-- Index on episodes for progress tracking
CREATE INDEX IF NOT EXISTS idx_tvshows_watched_episodes ON tvshows(watched_episodes DESC);
CREATE INDEX IF NOT EXISTS idx_tvshows_total_episodes ON tvshows(total_episodes DESC);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Uncomment to verify the migration was successful:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'movies'
-- ORDER BY ordinal_position;

-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'tvshows'
-- ORDER BY ordinal_position;
