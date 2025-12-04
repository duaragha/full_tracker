-- ============================================
-- JOURNAL FEATURE
-- Migration: Create journal schema with entries, tags, and associations
-- Date: 2025-12-04
-- ============================================

-- ============================================
-- JOURNAL ENTRIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS journal_entries (
  id SERIAL PRIMARY KEY,

  -- Core content
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  word_count INTEGER DEFAULT 0,

  -- Entry metadata
  entry_date DATE NOT NULL,
  entry_time TIME NOT NULL,

  -- Contextual information
  mood TEXT,                    -- 'great', 'good', 'okay', 'bad', 'terrible'
  weather TEXT,                 -- 'sunny', 'cloudy', 'rainy', 'snowy', 'windy', 'stormy'
  location TEXT,
  activity TEXT,                -- 'working', 'relaxing', 'exercising', 'traveling', 'eating'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_mood CHECK (mood IS NULL OR mood IN ('great', 'good', 'okay', 'bad', 'terrible')),
  CONSTRAINT valid_weather CHECK (weather IS NULL OR weather IN ('sunny', 'cloudy', 'rainy', 'snowy', 'windy', 'stormy')),
  CONSTRAINT valid_activity CHECK (activity IS NULL OR activity IN ('working', 'relaxing', 'exercising', 'traveling', 'eating'))
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_mood ON journal_entries(mood);
CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at ON journal_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_date_time ON journal_entries(entry_date, entry_time);

-- Create full-text search index on content
CREATE INDEX IF NOT EXISTS idx_journal_entries_content_fts ON journal_entries USING GIN (
  to_tsvector('english', title || ' ' || content)
);

-- ============================================
-- JOURNAL TAGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS journal_tags (
  id SERIAL PRIMARY KEY,

  -- Tag data
  name TEXT NOT NULL UNIQUE,
  usage_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for tag lookups
CREATE INDEX IF NOT EXISTS idx_journal_tags_name ON journal_tags(name);

-- ============================================
-- JOURNAL ENTRY-TAGS ASSOCIATION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS journal_entry_tags (
  entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES journal_tags(id) ON DELETE CASCADE,

  -- Prevent duplicate associations
  PRIMARY KEY (entry_id, tag_id)
);

-- Create index for fast tag lookups per entry
CREATE INDEX IF NOT EXISTS idx_journal_entry_tags_tag_id ON journal_entry_tags(tag_id);

-- ============================================
-- TRIGGER: Update journal_entries.updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_journal_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_journal_entries_updated_at ON journal_entries;
CREATE TRIGGER trigger_journal_entries_updated_at
BEFORE UPDATE ON journal_entries
FOR EACH ROW
EXECUTE FUNCTION update_journal_entries_updated_at();

-- ============================================
-- TRIGGER: Calculate word count on insert/update
-- ============================================

CREATE OR REPLACE FUNCTION calculate_journal_entry_word_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Simple word count: split by whitespace and count non-empty strings
  NEW.word_count = ARRAY_LENGTH(STRING_TO_ARRAY(TRIM(NEW.content), ' '), 1);
  -- Handle empty content
  IF NEW.word_count IS NULL THEN
    NEW.word_count = 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_journal_entry_word_count ON journal_entries;
CREATE TRIGGER trigger_journal_entry_word_count
BEFORE INSERT OR UPDATE ON journal_entries
FOR EACH ROW
EXECUTE FUNCTION calculate_journal_entry_word_count();

-- ============================================
-- TRIGGER: Update tag usage count
-- ============================================

CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE journal_tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE journal_tags SET usage_count = usage_count - 1 WHERE id = OLD.tag_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tag_usage_count ON journal_entry_tags;
CREATE TRIGGER trigger_tag_usage_count
AFTER INSERT OR DELETE ON journal_entry_tags
FOR EACH ROW
EXECUTE FUNCTION update_tag_usage_count();
