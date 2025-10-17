-- Migration: Add indexes for grid view performance optimization
-- These indexes improve query performance for sorting, filtering, and searching
-- Date: 2025-10-16

-- ============================================
-- MOVIES TABLE INDEXES
-- ============================================

-- Index on created_at for default sorting (most recent first)
CREATE INDEX IF NOT EXISTS idx_movies_created_at ON movies(created_at DESC);

-- Index on title for search/filter operations
CREATE INDEX IF NOT EXISTS idx_movies_title ON movies(title);

-- Index on watched_date for sorting by watch history
CREATE INDEX IF NOT EXISTS idx_movies_watched_date ON movies(watched_date DESC NULLS LAST);

-- Index on rating for sorting by rating
CREATE INDEX IF NOT EXISTS idx_movies_rating ON movies(rating DESC NULLS LAST);

-- Composite index for common filtered queries (status + sort)
-- This is useful when filtering by status and sorting by date
CREATE INDEX IF NOT EXISTS idx_movies_status_created_at
  ON movies(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_movies_status_rating
  ON movies(status, rating DESC NULLS LAST);

-- Composite index for watchlist queries
CREATE INDEX IF NOT EXISTS idx_movies_status_watchlist_date
  ON movies(status, watchlist_added_date DESC NULLS LAST)
  WHERE status = 'Watchlist';

-- ============================================
-- TV SHOWS TABLE INDEXES
-- ============================================

-- Index on created_at for default sorting
CREATE INDEX IF NOT EXISTS idx_tvshows_created_at ON tvshows(created_at DESC);

-- Index on title for search/filter operations
CREATE INDEX IF NOT EXISTS idx_tvshows_title ON tvshows(title);

-- Index on total_minutes for sorting by watch time
CREATE INDEX IF NOT EXISTS idx_tvshows_total_minutes ON tvshows(total_minutes DESC NULLS LAST);

-- Index on days_tracking for sorting by tracking duration
CREATE INDEX IF NOT EXISTS idx_tvshows_days_tracking ON tvshows(days_tracking DESC NULLS LAST);

-- Composite index for progress calculation (watched/total episodes)
CREATE INDEX IF NOT EXISTS idx_tvshows_progress
  ON tvshows(watched_episodes, total_episodes)
  WHERE total_episodes > 0;

-- Composite index for common filtered queries
CREATE INDEX IF NOT EXISTS idx_tvshows_status_created_at
  ON tvshows(status, created_at DESC);

-- ============================================
-- FULL-TEXT SEARCH INDEXES (OPTIONAL)
-- ============================================

-- These indexes enable faster ILIKE searches (case-insensitive)
-- They use trigram similarity matching
-- Requires pg_trgm extension to be enabled

-- Enable pg_trgm extension if not already enabled
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Full-text search index for movie titles
-- Uncomment if you want advanced search capabilities:
-- CREATE INDEX IF NOT EXISTS idx_movies_title_trgm
--   ON movies USING gin (title gin_trgm_ops);

-- Full-text search index for tvshow titles
-- CREATE INDEX IF NOT EXISTS idx_tvshows_title_trgm
--   ON tvshows USING gin (title gin_trgm_ops);

-- Full-text search for movie directors
-- CREATE INDEX IF NOT EXISTS idx_movies_director_trgm
--   ON movies USING gin (director gin_trgm_ops);

-- ============================================
-- ANALYZE TABLES
-- ============================================

-- Update table statistics for query planner
-- This helps PostgreSQL choose the most efficient query plans
ANALYZE movies;
ANALYZE tvshows;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Uncomment to view all indexes on movies table:
-- SELECT
--     indexname,
--     indexdef
-- FROM pg_indexes
-- WHERE tablename = 'movies'
-- ORDER BY indexname;

-- Uncomment to view all indexes on tvshows table:
-- SELECT
--     indexname,
--     indexdef
-- FROM pg_indexes
-- WHERE tablename = 'tvshows'
-- ORDER BY indexname;

-- Uncomment to check index sizes:
-- SELECT
--     schemaname,
--     tablename,
--     indexname,
--     pg_size_pretty(pg_relation_size(indexrelid)) as size
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
--   AND (tablename = 'movies' OR tablename = 'tvshows')
-- ORDER BY pg_relation_size(indexrelid) DESC;
