-- ============================================
-- WORKOUT DATA IMPORT SYSTEM
-- Migration: Add tables for import tracking and progression rules
-- Date: 2025-12-01
-- ============================================

-- ============================================
-- IMPORT TRACKING TABLE
-- ============================================

-- Track all import operations for audit and rollback
CREATE TABLE IF NOT EXISTS fitness_imports (
  id SERIAL PRIMARY KEY,

  -- Import metadata
  import_type TEXT NOT NULL,              -- 'liftoscript', 'liftosaur_json', 'hevy_csv'
  source_filename TEXT,                   -- Original filename

  -- Statistics
  stats JSONB DEFAULT '{"exercises": 0, "programs": 0, "workouts": 0, "sets": 0, "personalRecords": 0}'::jsonb,

  -- Rollback tracking
  is_rolled_back BOOLEAN DEFAULT FALSE,
  rolled_back_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast lookup of imports by type
CREATE INDEX IF NOT EXISTS idx_fitness_imports_type ON fitness_imports(import_type);
CREATE INDEX IF NOT EXISTS idx_fitness_imports_rolled_back ON fitness_imports(is_rolled_back);

-- ============================================
-- PROGRESSION RULES TABLE
-- ============================================

-- Store Liftoscript progression rules for exercises
CREATE TABLE IF NOT EXISTS fitness_progression_rules (
  id SERIAL PRIMARY KEY,

  -- Reference to exercise in a template
  template_exercise_id INTEGER NOT NULL REFERENCES fitness_template_exercises(id) ON DELETE CASCADE,

  -- Rule configuration
  rule_type TEXT NOT NULL,                -- 'lp', 'dp', 'sum', 'custom'
  rule_config JSONB NOT NULL,             -- Function parameters (weight, min_reps, max_reps, etc.)

  -- Raw Liftoscript code for custom rules
  liftoscript_code TEXT,

  -- State variables for complex progressions
  state_variables JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast lookup of rules by template exercise
CREATE INDEX IF NOT EXISTS idx_progression_rules_template_exercise ON fitness_progression_rules(template_exercise_id);
CREATE INDEX IF NOT EXISTS idx_progression_rules_type ON fitness_progression_rules(rule_type);

-- ============================================
-- EXERCISE ALIASES TABLE
-- ============================================

-- Map exercise names from different sources to canonical exercises
CREATE TABLE IF NOT EXISTS fitness_exercise_aliases (
  id SERIAL PRIMARY KEY,

  -- Reference to canonical exercise
  exercise_id INTEGER NOT NULL REFERENCES fitness_exercises(id) ON DELETE CASCADE,

  -- The alternative name
  alias TEXT NOT NULL,

  -- Source of the alias
  source TEXT NOT NULL,                   -- 'liftosaur', 'hevy', 'strong', 'manual'

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate aliases for the same exercise from the same source
  CONSTRAINT unique_exercise_alias_source UNIQUE (exercise_id, alias, source)
);

-- Create index for fast fuzzy matching
CREATE INDEX IF NOT EXISTS idx_exercise_aliases_alias ON fitness_exercise_aliases(alias);
CREATE INDEX IF NOT EXISTS idx_exercise_aliases_source ON fitness_exercise_aliases(source);
CREATE INDEX IF NOT EXISTS idx_exercise_aliases_exercise ON fitness_exercise_aliases(exercise_id);
