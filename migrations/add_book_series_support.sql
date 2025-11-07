-- Book Series Tables
-- This migration adds support for grouping books into series

-- Remove old Audible columns since Audible integration was removed
ALTER TABLE books DROP COLUMN IF EXISTS audible_synced;
ALTER TABLE books DROP COLUMN IF EXISTS audible_last_sync;
ALTER TABLE books DROP COLUMN IF EXISTS audible_asin;

-- Create book_series table
CREATE TABLE IF NOT EXISTS book_series (
  id SERIAL PRIMARY KEY,
  name VARCHAR(500) NOT NULL UNIQUE,
  description TEXT,
  total_books INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_book_series_name ON book_series(name);

-- Create book_series_memberships table (links books to series)
CREATE TABLE IF NOT EXISTS book_series_memberships (
  id SERIAL PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  series_id INTEGER NOT NULL REFERENCES book_series(id) ON DELETE CASCADE,
  position_in_series DECIMAL(5, 2), -- Allows for 1, 2, 3 or 1.5 for novellas between books
  detection_method VARCHAR(50) DEFAULT 'manual', -- 'manual', 'google_books', 'title_pattern'
  confidence_score DECIMAL(3, 2) DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_book_series UNIQUE(book_id, series_id)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_book_series_memberships_book_id ON book_series_memberships(book_id);
CREATE INDEX IF NOT EXISTS idx_book_series_memberships_series_id ON book_series_memberships(series_id);

-- Create a view to easily get books with their series information
CREATE OR REPLACE VIEW books_with_series AS
SELECT
  b.*,
  bs.id as series_id,
  bs.name as series_name,
  bsm.position_in_series,
  bsm.detection_method
FROM books b
LEFT JOIN book_series_memberships bsm ON b.id = bsm.book_id
LEFT JOIN book_series bs ON bsm.series_id = bs.id
ORDER BY b.created_at DESC;
