-- ============================================
-- Readwise Clone Database Schema
-- Migration: Create complete reading/highlighting system
-- Date: 2025-11-11
-- ============================================
--
-- This migration creates a complete Readwise-like system with:
-- - Multi-source content management (Kindle, web, PDF, articles)
-- - Highlights with rich metadata and location tracking
-- - Tags and collections for organization
-- - Spaced repetition system (SM-2 algorithm)
-- - Full-text search optimization
-- - Export configurations
-- - Saved articles for read-later functionality
--
-- Performance targets:
-- - Support 10,000+ highlights per user
-- - Search response < 100ms
-- - Daily review queue generation < 50ms
-- - Tag filtering < 30ms
--
-- ============================================
-- SOURCE MANAGEMENT
-- ============================================

-- Sources: Books, articles, PDFs, web pages
CREATE TABLE IF NOT EXISTS sources (
  id SERIAL PRIMARY KEY,

  -- Core identification
  title TEXT NOT NULL,
  author TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('book', 'article', 'pdf', 'web', 'podcast', 'video')),

  -- Source-specific identifiers
  isbn TEXT,                          -- For books
  asin TEXT,                          -- For Kindle books
  url TEXT,                           -- For web content

  -- Publishing information
  publisher TEXT,
  published_date DATE,

  -- Content metadata
  category TEXT,
  tags TEXT[],                        -- Quick array for simple filtering

  -- Reading tracking
  total_highlights INTEGER DEFAULT 0,
  last_highlighted_at TIMESTAMPTZ,

  -- Media information
  cover_image_url TEXT,

  -- Flexible metadata storage
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Import tracking
  import_source TEXT,                 -- 'kindle', 'web_clipper', 'pdf_upload', 'manual'
  external_id TEXT,                   -- ID from external system

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_external_source UNIQUE (import_source, external_id)
);

-- ============================================
-- HIGHLIGHTS MANAGEMENT
-- ============================================

-- Highlights: Text excerpts with rich metadata
CREATE TABLE IF NOT EXISTS highlights (
  id SERIAL PRIMARY KEY,

  -- Source reference
  source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,

  -- Highlight content
  text TEXT NOT NULL,
  note TEXT,                          -- User's notes on the highlight

  -- Location information (stored as JSONB for flexibility)
  location JSONB DEFAULT '{}'::jsonb,
  -- Examples:
  -- Books: {"page": 42, "chapter": "Introduction", "percent": 15.5}
  -- Kindle: {"location": 1234, "page": 42}
  -- PDFs: {"page": 10, "annotation_id": "abc123"}
  -- Web: {"selector": "xpath or CSS selector", "url": "https://..."}

  -- Highlight metadata
  color TEXT,                         -- For color-coded highlights
  highlight_type TEXT DEFAULT 'highlight' CHECK (highlight_type IN ('highlight', 'note', 'bookmark')),

  -- User interaction
  is_favorite BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,

  -- Spaced repetition integration
  review_enabled BOOLEAN DEFAULT FALSE,

  -- Full-text search (computed column)
  search_vector tsvector,

  -- Timestamps
  highlighted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Deduplication
  content_hash TEXT,                  -- SHA256 of text for duplicate detection

  -- Constraints
  CHECK (length(text) > 0)
);

-- ============================================
-- TAGS SYSTEM
-- ============================================

-- Tags: User-defined categories
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,

  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT,                         -- Hex color for UI display

  -- Usage tracking
  highlight_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CHECK (length(name) > 0 AND length(name) <= 50)
);

-- Junction table: Highlights ↔ Tags (many-to-many)
CREATE TABLE IF NOT EXISTS highlight_tags (
  highlight_id INTEGER NOT NULL REFERENCES highlights(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (highlight_id, tag_id)
);

-- ============================================
-- COLLECTIONS SYSTEM
-- ============================================

-- Collections: Grouped highlights (like playlists)
CREATE TABLE IF NOT EXISTS collections (
  id SERIAL PRIMARY KEY,

  name TEXT NOT NULL,
  description TEXT,

  -- Collection metadata
  is_public BOOLEAN DEFAULT FALSE,
  color TEXT,
  icon TEXT,                          -- Icon identifier for UI

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Usage tracking
  highlight_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CHECK (length(name) > 0 AND length(name) <= 100)
);

-- Junction table: Collections ↔ Highlights (many-to-many with ordering)
CREATE TABLE IF NOT EXISTS collection_highlights (
  collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  highlight_id INTEGER NOT NULL REFERENCES highlights(id) ON DELETE CASCADE,

  -- Position within collection
  position INTEGER DEFAULT 0,

  -- Optional note specific to this collection
  collection_note TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (collection_id, highlight_id)
);

-- ============================================
-- SPACED REPETITION SYSTEM
-- ============================================

-- Review Cards: Spaced repetition data (SM-2 algorithm)
CREATE TABLE IF NOT EXISTS review_cards (
  id SERIAL PRIMARY KEY,

  -- Reference to highlight
  highlight_id INTEGER NOT NULL UNIQUE REFERENCES highlights(id) ON DELETE CASCADE,

  -- SM-2 Algorithm data
  easiness_factor NUMERIC(4, 2) DEFAULT 2.5,    -- EF: starts at 2.5
  interval_days INTEGER DEFAULT 0,              -- Days until next review
  repetitions INTEGER DEFAULT 0,                -- Number of successful reviews

  -- Review scheduling
  next_review_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_reviewed_at TIMESTAMPTZ,

  -- Performance tracking
  total_reviews INTEGER DEFAULT 0,
  correct_reviews INTEGER DEFAULT 0,

  -- Card state
  is_active BOOLEAN DEFAULT TRUE,
  is_suspended BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CHECK (easiness_factor >= 1.3),
  CHECK (interval_days >= 0),
  CHECK (repetitions >= 0)
);

-- Review History: Track all review attempts
CREATE TABLE IF NOT EXISTS review_history (
  id SERIAL PRIMARY KEY,

  review_card_id INTEGER NOT NULL REFERENCES review_cards(id) ON DELETE CASCADE,

  -- Review details
  quality INTEGER NOT NULL CHECK (quality >= 0 AND quality <= 5),  -- 0-5 scale (SM-2)
  response_time_ms INTEGER,                     -- How long to recall

  -- State before review
  easiness_factor_before NUMERIC(4, 2),
  interval_days_before INTEGER,

  -- State after review
  easiness_factor_after NUMERIC(4, 2),
  interval_days_after INTEGER,

  reviewed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CHECK (response_time_ms >= 0)
);

-- ============================================
-- SAVED ARTICLES (READ-LATER)
-- ============================================

-- Saved Articles: Full content for offline reading
CREATE TABLE IF NOT EXISTS saved_articles (
  id SERIAL PRIMARY KEY,

  -- Article metadata
  title TEXT NOT NULL,
  author TEXT,
  url TEXT NOT NULL UNIQUE,

  -- Content (cleaned and formatted)
  content TEXT NOT NULL,
  html_content TEXT,                  -- Original HTML if needed
  excerpt TEXT,                       -- Short summary/preview

  -- Metadata
  word_count INTEGER,
  reading_time_minutes INTEGER,
  published_date TIMESTAMPTZ,

  -- Media
  featured_image_url TEXT,

  -- Reading tracking
  is_read BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  is_favorite BOOLEAN DEFAULT FALSE,
  reading_position INTEGER DEFAULT 0, -- Scroll position or percentage

  -- Tags (simple array for quick filtering)
  tags TEXT[],

  -- Full-text search
  search_vector tsvector,

  -- Source tracking
  saved_via TEXT,                     -- 'extension', 'email', 'rss', 'manual'

  -- Flexible metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CHECK (length(title) > 0),
  CHECK (length(content) > 0),
  CHECK (reading_position >= 0)
);

-- ============================================
-- EXPORT CONFIGURATIONS
-- ============================================

-- Export Settings: OneNote, Notion, Markdown configurations
CREATE TABLE IF NOT EXISTS export_settings (
  id SERIAL PRIMARY KEY,

  -- Export target
  export_type TEXT NOT NULL CHECK (export_type IN ('onenote', 'notion', 'markdown', 'obsidian', 'roam', 'evernote')),
  name TEXT NOT NULL,                 -- User-friendly name

  -- Configuration (flexible JSON storage)
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Examples:
  -- OneNote: {"notebook_id": "xxx", "section_id": "yyy", "access_token": "zzz"}
  -- Notion: {"database_id": "xxx", "api_key": "yyy", "template": "zzz"}
  -- Markdown: {"format": "obsidian", "folder_structure": "by_source", "template": "zzz"}

  -- Export behavior
  is_active BOOLEAN DEFAULT TRUE,
  auto_export BOOLEAN DEFAULT FALSE,  -- Automatic export on highlight
  export_frequency TEXT,              -- 'daily', 'weekly', 'monthly', null for manual

  -- Filter settings
  export_filters JSONB DEFAULT '{}'::jsonb,
  -- Example: {"tags": ["important"], "sources": [1, 2, 3], "min_highlights": 1}

  -- Last export tracking
  last_export_at TIMESTAMPTZ,
  last_export_status TEXT,            -- 'success', 'failed', 'partial'
  last_export_count INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_export_name UNIQUE (export_type, name)
);

-- ============================================
-- IMPORT TRACKING
-- ============================================

-- Import History: Track imports from various sources
CREATE TABLE IF NOT EXISTS import_history (
  id SERIAL PRIMARY KEY,

  -- Import details
  import_source TEXT NOT NULL,        -- 'kindle', 'pdf', 'web_clipper', 'instapaper', 'pocket'
  import_type TEXT NOT NULL,          -- 'highlights', 'articles', 'books'

  -- Results
  items_processed INTEGER DEFAULT 0,
  items_imported INTEGER DEFAULT 0,
  items_skipped INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,

  -- Status
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,

  -- Import metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Sources indexes
CREATE INDEX IF NOT EXISTS idx_sources_type ON sources(source_type);
CREATE INDEX IF NOT EXISTS idx_sources_author ON sources(author);
CREATE INDEX IF NOT EXISTS idx_sources_category ON sources(category);
CREATE INDEX IF NOT EXISTS idx_sources_updated_at ON sources(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sources_import_source ON sources(import_source);
CREATE INDEX IF NOT EXISTS idx_sources_tags ON sources USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_sources_metadata ON sources USING GIN(metadata);

-- Highlights indexes
CREATE INDEX IF NOT EXISTS idx_highlights_source_id ON highlights(source_id);
CREATE INDEX IF NOT EXISTS idx_highlights_created_at ON highlights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_highlights_highlighted_at ON highlights(highlighted_at DESC);
CREATE INDEX IF NOT EXISTS idx_highlights_favorite ON highlights(is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_highlights_archived ON highlights(is_archived) WHERE is_archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_highlights_review_enabled ON highlights(review_enabled) WHERE review_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_highlights_content_hash ON highlights(content_hash);
CREATE INDEX IF NOT EXISTS idx_highlights_location ON highlights USING GIN(location);

-- Full-text search index for highlights
CREATE INDEX IF NOT EXISTS idx_highlights_search ON highlights USING GIN(search_vector);

-- Tags indexes
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_count ON tags(highlight_count DESC);

-- Highlight_tags indexes
CREATE INDEX IF NOT EXISTS idx_highlight_tags_tag_id ON highlight_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_highlight_tags_highlight_id ON highlight_tags(highlight_id);

-- Collections indexes
CREATE INDEX IF NOT EXISTS idx_collections_sort_order ON collections(sort_order);
CREATE INDEX IF NOT EXISTS idx_collections_created_at ON collections(created_at DESC);

-- Collection_highlights indexes
CREATE INDEX IF NOT EXISTS idx_collection_highlights_collection_id ON collection_highlights(collection_id, position);
CREATE INDEX IF NOT EXISTS idx_collection_highlights_highlight_id ON collection_highlights(highlight_id);

-- Review cards indexes (CRITICAL for daily review queue)
CREATE INDEX IF NOT EXISTS idx_review_cards_next_review ON review_cards(next_review_date, is_active) WHERE is_active = TRUE AND is_suspended = FALSE;
CREATE INDEX IF NOT EXISTS idx_review_cards_highlight_id ON review_cards(highlight_id);
CREATE INDEX IF NOT EXISTS idx_review_cards_last_reviewed ON review_cards(last_reviewed_at DESC);

-- Review history indexes
CREATE INDEX IF NOT EXISTS idx_review_history_card_id ON review_history(review_card_id, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_history_reviewed_at ON review_history(reviewed_at DESC);

-- Saved articles indexes
CREATE INDEX IF NOT EXISTS idx_saved_articles_url ON saved_articles(url);
CREATE INDEX IF NOT EXISTS idx_saved_articles_saved_at ON saved_articles(saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_articles_is_read ON saved_articles(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_saved_articles_tags ON saved_articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_saved_articles_search ON saved_articles USING GIN(search_vector);

-- Export settings indexes
CREATE INDEX IF NOT EXISTS idx_export_settings_type ON export_settings(export_type);
CREATE INDEX IF NOT EXISTS idx_export_settings_active ON export_settings(is_active) WHERE is_active = TRUE;

-- Import history indexes
CREATE INDEX IF NOT EXISTS idx_import_history_source ON import_history(import_source);
CREATE INDEX IF NOT EXISTS idx_import_history_status ON import_history(status);
CREATE INDEX IF NOT EXISTS idx_import_history_started_at ON import_history(started_at DESC);

-- ============================================
-- TRIGGERS FOR AUTO-UPDATE
-- ============================================

-- Update sources.updated_at on change
CREATE OR REPLACE FUNCTION update_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sources_updated_at ON sources;
CREATE TRIGGER trigger_sources_updated_at
  BEFORE UPDATE ON sources
  FOR EACH ROW
  EXECUTE FUNCTION update_sources_updated_at();

-- Update highlights.updated_at on change
CREATE OR REPLACE FUNCTION update_highlights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_highlights_updated_at ON highlights;
CREATE TRIGGER trigger_highlights_updated_at
  BEFORE UPDATE ON highlights
  FOR EACH ROW
  EXECUTE FUNCTION update_highlights_updated_at();

-- Update tags.updated_at on change
CREATE OR REPLACE FUNCTION update_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tags_updated_at ON tags;
CREATE TRIGGER trigger_tags_updated_at
  BEFORE UPDATE ON tags
  FOR EACH ROW
  EXECUTE FUNCTION update_tags_updated_at();

-- Update collections.updated_at on change
CREATE OR REPLACE FUNCTION update_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_collections_updated_at ON collections;
CREATE TRIGGER trigger_collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION update_collections_updated_at();

-- Update saved_articles.updated_at on change
CREATE OR REPLACE FUNCTION update_saved_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_saved_articles_updated_at ON saved_articles;
CREATE TRIGGER trigger_saved_articles_updated_at
  BEFORE UPDATE ON saved_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_articles_updated_at();

-- ============================================
-- TRIGGERS FOR DENORMALIZED COUNTERS
-- ============================================

-- Update source highlight count when highlights change
CREATE OR REPLACE FUNCTION update_source_highlight_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE sources
    SET total_highlights = total_highlights + 1,
        last_highlighted_at = NEW.highlighted_at
    WHERE id = NEW.source_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE sources
    SET total_highlights = GREATEST(0, total_highlights - 1)
    WHERE id = OLD.source_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_source_highlight_count ON highlights;
CREATE TRIGGER trigger_update_source_highlight_count
  AFTER INSERT OR DELETE ON highlights
  FOR EACH ROW
  EXECUTE FUNCTION update_source_highlight_count();

-- Update tag highlight count when tags are added/removed
CREATE OR REPLACE FUNCTION update_tag_highlight_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tags
    SET highlight_count = highlight_count + 1
    WHERE id = NEW.tag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tags
    SET highlight_count = GREATEST(0, highlight_count - 1)
    WHERE id = OLD.tag_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tag_highlight_count ON highlight_tags;
CREATE TRIGGER trigger_update_tag_highlight_count
  AFTER INSERT OR DELETE ON highlight_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_tag_highlight_count();

-- Update collection highlight count
CREATE OR REPLACE FUNCTION update_collection_highlight_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE collections
    SET highlight_count = highlight_count + 1
    WHERE id = NEW.collection_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE collections
    SET highlight_count = GREATEST(0, highlight_count - 1)
    WHERE id = OLD.collection_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_collection_highlight_count ON collection_highlights;
CREATE TRIGGER trigger_update_collection_highlight_count
  AFTER INSERT OR DELETE ON collection_highlights
  FOR EACH ROW
  EXECUTE FUNCTION update_collection_highlight_count();

-- ============================================
-- TRIGGERS FOR FULL-TEXT SEARCH
-- ============================================

-- Auto-update search_vector for highlights
CREATE OR REPLACE FUNCTION update_highlight_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector =
    setweight(to_tsvector('english', COALESCE(NEW.text, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.note, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_highlight_search_vector ON highlights;
CREATE TRIGGER trigger_highlight_search_vector
  BEFORE INSERT OR UPDATE OF text, note ON highlights
  FOR EACH ROW
  EXECUTE FUNCTION update_highlight_search_vector();

-- Auto-update search_vector for saved articles
CREATE OR REPLACE FUNCTION update_saved_article_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector =
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.excerpt, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_saved_article_search_vector ON saved_articles;
CREATE TRIGGER trigger_saved_article_search_vector
  BEFORE INSERT OR UPDATE OF title, excerpt, content ON saved_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_article_search_vector();

-- ============================================
-- TRIGGERS FOR CONTENT HASH (DEDUPLICATION)
-- ============================================

-- Generate content hash for highlights
CREATE OR REPLACE FUNCTION generate_highlight_content_hash()
RETURNS TRIGGER AS $$
BEGIN
  NEW.content_hash = encode(digest(NEW.text, 'sha256'), 'hex');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_highlight_content_hash ON highlights;
CREATE TRIGGER trigger_generate_highlight_content_hash
  BEFORE INSERT OR UPDATE OF text ON highlights
  FOR EACH ROW
  EXECUTE FUNCTION generate_highlight_content_hash();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function: Get daily review queue (optimized for SM-2)
CREATE OR REPLACE FUNCTION get_daily_review_queue(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  card_id INTEGER,
  highlight_id INTEGER,
  highlight_text TEXT,
  source_title TEXT,
  easiness_factor NUMERIC,
  interval_days INTEGER,
  repetitions INTEGER,
  last_reviewed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rc.id,
    rc.highlight_id,
    h.text,
    s.title,
    rc.easiness_factor,
    rc.interval_days,
    rc.repetitions,
    rc.last_reviewed_at
  FROM review_cards rc
  INNER JOIN highlights h ON h.id = rc.highlight_id
  INNER JOIN sources s ON s.id = h.source_id
  WHERE rc.next_review_date <= p_date
    AND rc.is_active = TRUE
    AND rc.is_suspended = FALSE
    AND h.is_archived = FALSE
  ORDER BY rc.next_review_date ASC, rc.last_reviewed_at ASC NULLS FIRST
  LIMIT 50;  -- Reasonable daily limit
END;
$$ LANGUAGE plpgsql;

-- Function: Search highlights with ranking
CREATE OR REPLACE FUNCTION search_highlights(
  p_query TEXT,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  highlight_id INTEGER,
  text TEXT,
  note TEXT,
  source_title TEXT,
  author TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.text,
    h.note,
    s.title,
    s.author,
    ts_rank(h.search_vector, plainto_tsquery('english', p_query)) AS rank
  FROM highlights h
  INNER JOIN sources s ON s.id = h.source_id
  WHERE h.search_vector @@ plainto_tsquery('english', p_query)
    AND h.is_archived = FALSE
  ORDER BY rank DESC, h.highlighted_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function: Find duplicate highlights
CREATE OR REPLACE FUNCTION find_duplicate_highlights()
RETURNS TABLE (
  content_hash TEXT,
  highlight_count BIGINT,
  highlight_ids INTEGER[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.content_hash,
    COUNT(*) as highlight_count,
    ARRAY_AGG(h.id ORDER BY h.created_at) as highlight_ids
  FROM highlights h
  WHERE h.content_hash IS NOT NULL
  GROUP BY h.content_hash
  HAVING COUNT(*) > 1
  ORDER BY highlight_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Update review card after review (SM-2 algorithm)
CREATE OR REPLACE FUNCTION update_review_card_sm2(
  p_card_id INTEGER,
  p_quality INTEGER  -- 0-5 scale
)
RETURNS VOID AS $$
DECLARE
  v_ef NUMERIC(4, 2);
  v_interval INTEGER;
  v_repetitions INTEGER;
  v_old_ef NUMERIC(4, 2);
  v_old_interval INTEGER;
BEGIN
  -- Get current values
  SELECT easiness_factor, interval_days, repetitions
  INTO v_old_ef, v_old_interval, v_repetitions
  FROM review_cards
  WHERE id = p_card_id;

  -- Calculate new easiness factor
  v_ef := v_old_ef + (0.1 - (5 - p_quality) * (0.08 + (5 - p_quality) * 0.02));
  v_ef := GREATEST(1.3, v_ef);  -- Minimum EF is 1.3

  -- Calculate new interval and repetitions
  IF p_quality >= 3 THEN
    -- Correct response
    IF v_repetitions = 0 THEN
      v_interval := 1;
    ELSIF v_repetitions = 1 THEN
      v_interval := 6;
    ELSE
      v_interval := ROUND(v_old_interval * v_ef);
    END IF;
    v_repetitions := v_repetitions + 1;
  ELSE
    -- Incorrect response - reset
    v_interval := 1;
    v_repetitions := 0;
  END IF;

  -- Update review card
  UPDATE review_cards
  SET easiness_factor = v_ef,
      interval_days = v_interval,
      repetitions = v_repetitions,
      next_review_date = CURRENT_DATE + v_interval,
      last_reviewed_at = NOW(),
      total_reviews = total_reviews + 1,
      correct_reviews = correct_reviews + CASE WHEN p_quality >= 3 THEN 1 ELSE 0 END,
      updated_at = NOW()
  WHERE id = p_card_id;

  -- Insert history record
  INSERT INTO review_history (
    review_card_id,
    quality,
    easiness_factor_before,
    interval_days_before,
    easiness_factor_after,
    interval_days_after
  ) VALUES (
    p_card_id,
    p_quality,
    v_old_ef,
    v_old_interval,
    v_ef,
    v_interval
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TABLE COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE sources IS 'Content sources: books, articles, PDFs, web pages';
COMMENT ON TABLE highlights IS 'Text excerpts with location and metadata';
COMMENT ON TABLE tags IS 'User-defined categories for organization';
COMMENT ON TABLE highlight_tags IS 'Many-to-many relationship between highlights and tags';
COMMENT ON TABLE collections IS 'Curated groups of highlights';
COMMENT ON TABLE collection_highlights IS 'Many-to-many relationship between collections and highlights';
COMMENT ON TABLE review_cards IS 'Spaced repetition data using SM-2 algorithm';
COMMENT ON TABLE review_history IS 'Historical record of all review attempts';
COMMENT ON TABLE saved_articles IS 'Full articles saved for read-later functionality';
COMMENT ON TABLE export_settings IS 'Export configurations for OneNote, Notion, etc.';
COMMENT ON TABLE import_history IS 'Tracking of imports from external sources';

-- Key column comments
COMMENT ON COLUMN highlights.search_vector IS 'Full-text search index (auto-updated)';
COMMENT ON COLUMN highlights.content_hash IS 'SHA256 hash for duplicate detection (auto-generated)';
COMMENT ON COLUMN highlights.location IS 'JSONB storing source-specific location data';
COMMENT ON COLUMN review_cards.easiness_factor IS 'SM-2 easiness factor (1.3-2.5+)';
COMMENT ON COLUMN review_cards.interval_days IS 'Days until next review (SM-2)';
COMMENT ON COLUMN review_history.quality IS 'Review quality rating (0-5 scale for SM-2)';

-- ============================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================

ANALYZE sources;
ANALYZE highlights;
ANALYZE tags;
ANALYZE highlight_tags;
ANALYZE collections;
ANALYZE collection_highlights;
ANALYZE review_cards;
ANALYZE review_history;
ANALYZE saved_articles;
ANALYZE export_settings;
ANALYZE import_history;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
