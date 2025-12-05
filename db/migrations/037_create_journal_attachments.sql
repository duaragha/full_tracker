-- ============================================
-- JOURNAL ATTACHMENTS
-- Migration: Create journal attachments table for file uploads
-- Date: 2025-12-05
-- ============================================

-- ============================================
-- JOURNAL ATTACHMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS journal_attachments (
  id SERIAL PRIMARY KEY,

  -- Foreign key to journal entry (nullable for draft uploads before entry is created)
  journal_entry_id INTEGER REFERENCES journal_entries(id) ON DELETE CASCADE,

  -- File information
  filename TEXT NOT NULL,          -- UUID-prefixed stored filename
  original_name TEXT NOT NULL,     -- Original filename from upload
  mime_type TEXT NOT NULL,         -- MIME type (e.g., 'image/jpeg', 'application/pdf')
  size_bytes INTEGER NOT NULL,     -- File size in bytes

  -- Storage path relative to uploads directory
  storage_path TEXT NOT NULL,      -- e.g., 'journal/2025/12/uuid-filename.jpg'

  -- Timestamps
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_size CHECK (size_bytes > 0 AND size_bytes <= 10485760), -- Max 10MB
  CONSTRAINT valid_mime_type CHECK (
    mime_type IN (
      -- Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      -- Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    )
  )
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_journal_attachments_entry_id ON journal_attachments(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_attachments_uploaded_at ON journal_attachments(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_journal_attachments_mime_type ON journal_attachments(mime_type);

-- Index for finding orphaned attachments (null entry_id older than 24h)
CREATE INDEX IF NOT EXISTS idx_journal_attachments_orphaned
  ON journal_attachments(uploaded_at)
  WHERE journal_entry_id IS NULL;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE journal_attachments IS 'File attachments for journal entries (images, PDFs, documents)';
COMMENT ON COLUMN journal_attachments.journal_entry_id IS 'Nullable to allow draft uploads before entry creation';
COMMENT ON COLUMN journal_attachments.filename IS 'UUID-prefixed filename stored on disk';
COMMENT ON COLUMN journal_attachments.original_name IS 'Original filename from user upload';
COMMENT ON COLUMN journal_attachments.storage_path IS 'Relative path from uploads directory';
