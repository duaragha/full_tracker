-- Migration: Add missing fields to books table
-- This migration adds fields that are defined in TypeScript types but missing from database schema
-- Date: 2025-10-29

-- ============================================
-- BOOKS TABLE UPDATES
-- ============================================

-- Add missing book fields
ALTER TABLE books
  ADD COLUMN IF NOT EXISTS release_date DATE,
  ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('Ebook', 'Audiobook', 'Physical')) DEFAULT 'Physical',
  ADD COLUMN IF NOT EXISTS minutes INTEGER, -- For audiobooks
  ADD COLUMN IF NOT EXISTS days_read INTEGER DEFAULT 0;

-- Note: We're NOT adding 'publisher' column as it's not in the original schema
-- and can be stored in notes if needed, or we can add it separately if required

-- ============================================
-- DATA MIGRATION
-- ============================================

-- Migrate existing started_date to match new schema (no changes needed, already correct)
-- Migrate existing completed_date to match new schema (no changes needed, already correct)

-- Set default type to 'Physical' for existing books
UPDATE books
SET type = 'Physical'
WHERE type IS NULL;

-- ============================================
-- INDEXES FOR NEW FIELDS
-- ============================================

-- Index on type for filtering
CREATE INDEX IF NOT EXISTS idx_books_type ON books(type);

-- Index on release_date for sorting
CREATE INDEX IF NOT EXISTS idx_books_release_date ON books(release_date DESC);

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Uncomment to verify the migration was successful:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'books'
-- ORDER BY ordinal_position;
