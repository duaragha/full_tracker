-- Enable PostgreSQL trigram extension for fuzzy text matching
-- This is used by the book series detection service for finding similar series names

-- Enable pg_trgm extension (may already be enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index on book_series name for faster similarity searches
CREATE INDEX IF NOT EXISTS idx_book_series_name_trgm ON book_series USING gin (name gin_trgm_ops);

-- Create GIN index on book titles for faster similarity searches (useful for finding related books)
CREATE INDEX IF NOT EXISTS idx_books_title_trgm ON books USING gin (title gin_trgm_ops);

-- Add index on author for faster grouping by author
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
