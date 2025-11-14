-- ============================================
-- RSS Feed Subscription System
-- Migration: Create RSS feed management tables
-- Date: 2025-11-13
-- ============================================
--
-- This migration creates:
-- - RSS feeds table for managing subscriptions
-- - RSS feed items table for tracking individual articles
-- - Indexes for efficient querying
--
-- Features:
-- - Auto-fetch scheduling with configurable intervals
-- - Active/inactive feed management
-- - Duplicate prevention via unique constraints
-- - Integration with sources table
--
-- ============================================

-- RSS Feeds: Subscribed RSS/Atom feed sources
CREATE TABLE IF NOT EXISTS rss_feeds (
  id SERIAL PRIMARY KEY,

  -- Feed identification
  title TEXT NOT NULL,
  feed_url TEXT NOT NULL UNIQUE,
  site_url TEXT,
  description TEXT,

  -- Fetching metadata
  last_fetched_at TIMESTAMPTZ,
  fetch_interval_minutes INTEGER DEFAULT 60,  -- Default: check every hour
  is_active BOOLEAN DEFAULT TRUE,

  -- Error tracking
  last_error TEXT,
  consecutive_errors INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSS Feed Items: Individual articles/posts from feeds
CREATE TABLE IF NOT EXISTS rss_feed_items (
  id SERIAL PRIMARY KEY,

  -- Relations
  feed_id INTEGER NOT NULL REFERENCES rss_feeds(id) ON DELETE CASCADE,
  source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL,

  -- Item metadata
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  author TEXT,
  published_at TIMESTAMPTZ,

  -- Import tracking
  is_imported BOOLEAN DEFAULT FALSE,
  imported_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate items from same feed
  UNIQUE(feed_id, url)
);

-- ============================================
-- INDEXES
-- ============================================

-- Efficiently find feeds that need fetching
CREATE INDEX IF NOT EXISTS idx_rss_feeds_active
  ON rss_feeds(is_active, last_fetched_at)
  WHERE is_active = TRUE;

-- Find unimported items for a feed
CREATE INDEX IF NOT EXISTS idx_rss_feed_items_feed
  ON rss_feed_items(feed_id, is_imported);

-- Find items by source
CREATE INDEX IF NOT EXISTS idx_rss_feed_items_source
  ON rss_feed_items(source_id)
  WHERE source_id IS NOT NULL;

-- Recent items (for display)
CREATE INDEX IF NOT EXISTS idx_rss_feed_items_published
  ON rss_feed_items(published_at DESC NULLS LAST);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE rss_feeds IS 'RSS/Atom feed subscriptions';
COMMENT ON TABLE rss_feed_items IS 'Individual articles/posts from RSS feeds';

COMMENT ON COLUMN rss_feeds.fetch_interval_minutes IS 'How often to check feed for updates (minutes)';
COMMENT ON COLUMN rss_feeds.is_active IS 'Whether to actively fetch this feed';
COMMENT ON COLUMN rss_feeds.consecutive_errors IS 'Track errors to pause problematic feeds';

COMMENT ON COLUMN rss_feed_items.source_id IS 'Links to sources table when item is imported';
COMMENT ON COLUMN rss_feed_items.is_imported IS 'Whether this item has been imported as a source';
