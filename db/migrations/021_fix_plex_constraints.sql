-- Migration: Fix Plex Integration Constraints
-- Description: Updates constraints to allow 'manual' match method and additional resolution actions
-- Date: 2025-11-03

-- ============================================
-- FIX: plex_show_mappings match_method constraint
-- ============================================

-- Drop the old constraint
ALTER TABLE plex_show_mappings
DROP CONSTRAINT IF EXISTS plex_show_mappings_match_method_check;

-- Add new constraint with 'manual' included
ALTER TABLE plex_show_mappings
ADD CONSTRAINT plex_show_mappings_match_method_check
CHECK (match_method IN ('tmdb_id', 'tvdb_id', 'imdb_id', 'title_year', 'manual'));

-- ============================================
-- FIX: plex_conflicts resolution_action constraint
-- ============================================

-- Drop the old constraint
ALTER TABLE plex_conflicts
DROP CONSTRAINT IF EXISTS plex_conflicts_resolution_action_check;

-- Add new constraint with actual values used in code
ALTER TABLE plex_conflicts
ADD CONSTRAINT plex_conflicts_resolution_action_check
CHECK (resolution_action IN ('user_selected', 'user_created_new', 'auto_resolved', 'ignored', 'selected', 'create_new'));

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Plex integration constraints updated successfully';
  RAISE NOTICE 'match_method now allows: tmdb_id, tvdb_id, imdb_id, title_year, manual';
  RAISE NOTICE 'resolution_action now allows: user_selected, user_created_new, auto_resolved, ignored, selected, create_new';
END $$;
