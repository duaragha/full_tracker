-- ============================================
-- Add Web Article Support to Sources Table
-- Migration: Add content, excerpt, and domain fields
-- Date: 2025-11-12
-- ============================================

-- Add content field for storing full article text
ALTER TABLE sources
ADD COLUMN IF NOT EXISTS content TEXT;

-- Add excerpt field for article summaries/previews
ALTER TABLE sources
ADD COLUMN IF NOT EXISTS excerpt TEXT;

-- Add domain field for web article sources
ALTER TABLE sources
ADD COLUMN IF NOT EXISTS domain TEXT;

-- Add index for domain lookups
CREATE INDEX IF NOT EXISTS idx_sources_domain ON sources(domain);

-- Update the check constraint to include 'web_article' as a valid source_type
-- First, drop the existing constraint if it exists
ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_source_type_check;

-- Add the updated constraint
ALTER TABLE sources
ADD CONSTRAINT sources_source_type_check
CHECK (source_type IN ('book', 'article', 'pdf', 'web', 'podcast', 'video', 'web_article', 'kindle', 'manual'));

COMMENT ON COLUMN sources.content IS 'Full content for web articles and saved content';
COMMENT ON COLUMN sources.excerpt IS 'Short summary or preview of the content';
COMMENT ON COLUMN sources.domain IS 'Domain name for web-based sources (e.g., medium.com)';

-- Analyze table for query optimization
ANALYZE sources;
