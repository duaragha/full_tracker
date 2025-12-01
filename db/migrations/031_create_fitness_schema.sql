-- ============================================
-- FITNESS TRACKING SCHEMA
-- Migration: Complete workout and fitness tracking system
-- Date: 2025-11-14
-- ============================================

-- ============================================
-- CORE EXERCISE DATABASE
-- ============================================

-- Exercise Categories (e.g., Strength, Cardio, Flexibility, Sports)
CREATE TABLE IF NOT EXISTS fitness_exercise_categories (
  id SERIAL PRIMARY KEY,

  -- Basic info
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,                          -- Icon identifier for UI
  display_order INTEGER DEFAULT 0,    -- For sorting in UI

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_display_order CHECK (display_order >= 0)
);

-- Muscle Groups (e.g., Chest, Back, Legs, etc.)
CREATE TABLE IF NOT EXISTS fitness_muscle_groups (
  id SERIAL PRIMARY KEY,

  -- Basic info
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  anatomical_region TEXT,             -- e.g., "Upper Body", "Lower Body", "Core"
  display_order INTEGER DEFAULT 0,

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_muscle_group_order CHECK (display_order >= 0)
);

-- Equipment Types (e.g., Barbell, Dumbbell, Machine, Bodyweight)
CREATE TABLE IF NOT EXISTS fitness_equipment_types (
  id SERIAL PRIMARY KEY,

  -- Basic info
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,                          -- Icon identifier for UI
  display_order INTEGER DEFAULT 0,

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_equipment_order CHECK (display_order >= 0)
);

-- Exercise Database
CREATE TABLE IF NOT EXISTS fitness_exercises (
  id SERIAL PRIMARY KEY,

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,                  -- Step-by-step instructions
  category_id INTEGER REFERENCES fitness_exercise_categories(id) ON DELETE SET NULL,

  -- Equipment
  primary_equipment_id INTEGER REFERENCES fitness_equipment_types(id) ON DELETE SET NULL,
  equipment_alternatives JSONB DEFAULT '[]'::jsonb,  -- Array of alternative equipment IDs

  -- Difficulty and classification
  difficulty_level TEXT,              -- Beginner, Intermediate, Advanced
  force_type TEXT,                    -- Push, Pull, Static
  mechanics_type TEXT,                -- Compound, Isolation

  -- Media
  video_url TEXT,                     -- YouTube or other video URL
  image_urls JSONB DEFAULT '[]'::jsonb,  -- Array of image URLs
  thumbnail_url TEXT,

  -- Custom vs. Standard
  is_custom BOOLEAN DEFAULT FALSE,    -- User-created vs. system exercise
  is_public BOOLEAN DEFAULT FALSE,    -- Share custom exercise with others
  created_by_user_id INTEGER,         -- Future: link to user when auth is added

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  popularity_score INTEGER DEFAULT 0,  -- Track how often used
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_difficulty CHECK (difficulty_level IN ('Beginner', 'Intermediate', 'Advanced', NULL)),
  CONSTRAINT valid_force CHECK (force_type IN ('Push', 'Pull', 'Static', NULL)),
  CONSTRAINT valid_mechanics CHECK (mechanics_type IN ('Compound', 'Isolation', NULL))
);

-- Exercise to Muscle Group mapping (many-to-many)
CREATE TABLE IF NOT EXISTS fitness_exercise_muscle_groups (
  id SERIAL PRIMARY KEY,

  exercise_id INTEGER NOT NULL REFERENCES fitness_exercises(id) ON DELETE CASCADE,
  muscle_group_id INTEGER NOT NULL REFERENCES fitness_muscle_groups(id) ON DELETE CASCADE,

  -- Primary vs. Secondary muscle involvement
  is_primary BOOLEAN DEFAULT TRUE,
  involvement_level TEXT DEFAULT 'High',  -- High, Medium, Low

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_exercise_muscle UNIQUE (exercise_id, muscle_group_id),
  CONSTRAINT valid_involvement CHECK (involvement_level IN ('High', 'Medium', 'Low'))
);

-- ============================================
-- WORKOUT TRACKING
-- ============================================

-- Workout Templates/Routines
CREATE TABLE IF NOT EXISTS fitness_workout_templates (
  id SERIAL PRIMARY KEY,

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  notes TEXT,

  -- Organization
  folder_id INTEGER REFERENCES fitness_folders(id) ON DELETE SET NULL,

  -- Difficulty and goals
  difficulty_level TEXT,
  primary_goal TEXT,                  -- Strength, Hypertrophy, Endurance, Power, etc.
  estimated_duration_minutes INTEGER,

  -- Template metadata
  is_active BOOLEAN DEFAULT TRUE,
  is_favorite BOOLEAN DEFAULT FALSE,
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,

  -- Custom vs. Standard
  is_custom BOOLEAN DEFAULT TRUE,
  is_public BOOLEAN DEFAULT FALSE,
  created_by_user_id INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_template_difficulty CHECK (difficulty_level IN ('Beginner', 'Intermediate', 'Advanced', NULL)),
  CONSTRAINT valid_duration CHECK (estimated_duration_minutes IS NULL OR estimated_duration_minutes > 0)
);

-- Template Exercises (exercises in a template)
CREATE TABLE IF NOT EXISTS fitness_template_exercises (
  id SERIAL PRIMARY KEY,

  template_id INTEGER NOT NULL REFERENCES fitness_workout_templates(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES fitness_exercises(id) ON DELETE CASCADE,

  -- Exercise order and grouping
  exercise_order INTEGER NOT NULL DEFAULT 0,
  superset_group TEXT,                -- NULL or identifier like "A", "B" for supersets

  -- Planned sets configuration
  target_sets INTEGER,
  target_reps_min INTEGER,
  target_reps_max INTEGER,
  target_weight DECIMAL(10, 2),
  target_duration_seconds INTEGER,    -- For timed exercises
  target_distance_meters DECIMAL(10, 2),  -- For cardio

  -- Rest periods
  rest_between_sets_seconds INTEGER DEFAULT 60,

  -- Set types
  has_warmup_sets BOOLEAN DEFAULT FALSE,
  warmup_sets_count INTEGER DEFAULT 0,
  has_drop_sets BOOLEAN DEFAULT FALSE,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_exercise_order CHECK (exercise_order >= 0),
  CONSTRAINT valid_target_sets CHECK (target_sets IS NULL OR target_sets > 0),
  CONSTRAINT valid_target_reps CHECK (
    (target_reps_min IS NULL OR target_reps_min > 0) AND
    (target_reps_max IS NULL OR target_reps_max >= target_reps_min)
  )
);

-- Actual Workout Sessions
CREATE TABLE IF NOT EXISTS fitness_workouts (
  id SERIAL PRIMARY KEY,

  -- Basic info
  name TEXT,
  template_id INTEGER REFERENCES fitness_workout_templates(id) ON DELETE SET NULL,

  -- Timing
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,           -- Calculated: ended_at - started_at

  -- Location and conditions
  location TEXT,                      -- Gym name, "Home", etc.
  bodyweight_kg DECIMAL(5, 2),        -- Body weight at time of workout

  -- Mood and energy
  pre_workout_energy_level INTEGER,   -- 1-10 scale
  post_workout_energy_level INTEGER,  -- 1-10 scale
  overall_feeling TEXT,               -- Great, Good, Average, Poor, Terrible

  -- Notes
  notes TEXT,

  -- Stats (aggregated)
  total_volume_kg DECIMAL(10, 2),     -- Total weight lifted
  total_reps INTEGER,
  total_sets INTEGER,
  exercises_count INTEGER,

  -- Wear OS / Health Connect integration (future)
  health_connect_session_id TEXT,
  average_heart_rate INTEGER,
  max_heart_rate INTEGER,
  calories_burned INTEGER,

  -- Metadata
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_duration CHECK (duration_minutes IS NULL OR duration_minutes >= 0),
  CONSTRAINT valid_energy CHECK (
    (pre_workout_energy_level IS NULL OR (pre_workout_energy_level >= 1 AND pre_workout_energy_level <= 10)) AND
    (post_workout_energy_level IS NULL OR (post_workout_energy_level >= 1 AND post_workout_energy_level <= 10))
  ),
  CONSTRAINT valid_feeling CHECK (overall_feeling IN ('Great', 'Good', 'Average', 'Poor', 'Terrible', NULL)),
  CONSTRAINT valid_heart_rate CHECK (
    (average_heart_rate IS NULL OR average_heart_rate > 0) AND
    (max_heart_rate IS NULL OR max_heart_rate >= average_heart_rate)
  )
);

-- Workout Exercises (exercises performed in a workout)
CREATE TABLE IF NOT EXISTS fitness_workout_exercises (
  id SERIAL PRIMARY KEY,

  workout_id INTEGER NOT NULL REFERENCES fitness_workouts(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES fitness_exercises(id) ON DELETE CASCADE,

  -- Exercise order and grouping
  exercise_order INTEGER NOT NULL DEFAULT 0,
  superset_group TEXT,                -- NULL or identifier like "A", "B"

  -- Notes per exercise
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_workout_exercise_order CHECK (exercise_order >= 0)
);

-- Individual Sets
CREATE TABLE IF NOT EXISTS fitness_sets (
  id SERIAL PRIMARY KEY,

  workout_exercise_id INTEGER NOT NULL REFERENCES fitness_workout_exercises(id) ON DELETE CASCADE,

  -- Set details
  set_number INTEGER NOT NULL,
  set_type TEXT DEFAULT 'Normal',     -- Normal, Warmup, Drop, Failure, AMRAP

  -- Performance metrics
  reps INTEGER,
  weight_kg DECIMAL(10, 2),
  duration_seconds INTEGER,           -- For timed exercises
  distance_meters DECIMAL(10, 2),     -- For cardio/running

  -- Perceived effort
  rpe INTEGER,                        -- Rate of Perceived Exertion (1-10)

  -- Rest
  rest_seconds INTEGER,               -- Actual rest before next set

  -- Flags
  is_personal_record BOOLEAN DEFAULT FALSE,
  is_failed BOOLEAN DEFAULT FALSE,    -- Did not complete target reps

  -- Notes
  notes TEXT,

  -- Timestamp
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_set_number CHECK (set_number > 0),
  CONSTRAINT valid_set_type CHECK (set_type IN ('Normal', 'Warmup', 'Drop', 'Failure', 'AMRAP')),
  CONSTRAINT valid_rpe CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10)),
  CONSTRAINT valid_reps CHECK (reps IS NULL OR reps >= 0),
  CONSTRAINT valid_weight CHECK (weight_kg IS NULL OR weight_kg >= 0),
  CONSTRAINT valid_duration CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  CONSTRAINT valid_distance CHECK (distance_meters IS NULL OR distance_meters > 0),
  CONSTRAINT unique_workout_exercise_set UNIQUE (workout_exercise_id, set_number)
);

-- ============================================
-- FOLDER ORGANIZATION (for templates/programs)
-- ============================================

CREATE TABLE IF NOT EXISTS fitness_folders (
  id SERIAL PRIMARY KEY,

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,                         -- Hex color for UI

  -- Hierarchy
  parent_folder_id INTEGER REFERENCES fitness_folders(id) ON DELETE CASCADE,

  -- Display
  display_order INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_folder_order CHECK (display_order >= 0)
);

-- ============================================
-- PROGRESS TRACKING
-- ============================================

-- Personal Records
CREATE TABLE IF NOT EXISTS fitness_personal_records (
  id SERIAL PRIMARY KEY,

  exercise_id INTEGER NOT NULL REFERENCES fitness_exercises(id) ON DELETE CASCADE,

  -- Record type
  record_type TEXT NOT NULL,          -- One Rep Max, Volume, Reps, Distance, Duration

  -- Record value
  weight_kg DECIMAL(10, 2),
  reps INTEGER,
  duration_seconds INTEGER,
  distance_meters DECIMAL(10, 2),
  volume_kg DECIMAL(10, 2),           -- Total volume (weight * reps * sets)

  -- Context
  workout_id INTEGER REFERENCES fitness_workouts(id) ON DELETE SET NULL,
  set_id INTEGER REFERENCES fitness_sets(id) ON DELETE SET NULL,

  -- Date achieved
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_record_type CHECK (record_type IN ('One Rep Max', 'Volume', 'Reps', 'Distance', 'Duration', 'Weight for Reps'))
);

-- Body Measurements
CREATE TABLE IF NOT EXISTS fitness_body_measurements (
  id SERIAL PRIMARY KEY,

  -- Measurement date
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Weight and composition
  weight_kg DECIMAL(5, 2),
  body_fat_percentage DECIMAL(4, 2),
  muscle_mass_kg DECIMAL(5, 2),

  -- Circumference measurements (in cm)
  neck_cm DECIMAL(5, 2),
  chest_cm DECIMAL(5, 2),
  waist_cm DECIMAL(5, 2),
  hips_cm DECIMAL(5, 2),
  left_bicep_cm DECIMAL(5, 2),
  right_bicep_cm DECIMAL(5, 2),
  left_thigh_cm DECIMAL(5, 2),
  right_thigh_cm DECIMAL(5, 2),
  left_calf_cm DECIMAL(5, 2),
  right_calf_cm DECIMAL(5, 2),

  -- Additional metrics
  bmi DECIMAL(4, 2),                  -- Calculated: weight_kg / (height_m^2)

  -- Health Connect integration (future)
  health_connect_record_id TEXT,

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_body_fat CHECK (body_fat_percentage IS NULL OR (body_fat_percentage >= 0 AND body_fat_percentage <= 100)),
  CONSTRAINT valid_bmi CHECK (bmi IS NULL OR bmi > 0)
);

-- Progress Photos
CREATE TABLE IF NOT EXISTS fitness_progress_photos (
  id SERIAL PRIMARY KEY,

  -- Photo details
  photo_url TEXT NOT NULL,
  photo_type TEXT NOT NULL,           -- Front, Back, Side, Custom

  -- Associated measurement
  measurement_id INTEGER REFERENCES fitness_body_measurements(id) ON DELETE CASCADE,

  -- Date
  taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Weight at time of photo
  weight_kg DECIMAL(5, 2),

  -- Tags and notes
  tags JSONB DEFAULT '[]'::jsonb,     -- Array of tags
  notes TEXT,

  -- Privacy
  is_private BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_photo_type CHECK (photo_type IN ('Front', 'Back', 'Side Left', 'Side Right', 'Custom'))
);

-- ============================================
-- HEALTH CONNECT / WEAR OS INTEGRATION (Future-proofing)
-- ============================================

-- Store raw Health Connect data for syncing
CREATE TABLE IF NOT EXISTS fitness_health_connect_sync (
  id SERIAL PRIMARY KEY,

  -- Sync metadata
  sync_type TEXT NOT NULL,            -- Workout, HeartRate, Weight, Sleep, etc.
  health_connect_id TEXT NOT NULL UNIQUE,

  -- Raw data (flexible JSON storage)
  raw_data JSONB NOT NULL,

  -- Mapping to our data
  mapped_workout_id INTEGER REFERENCES fitness_workouts(id) ON DELETE SET NULL,
  mapped_measurement_id INTEGER REFERENCES fitness_body_measurements(id) ON DELETE SET NULL,

  -- Sync status
  is_processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,

  -- Timestamps
  health_connect_timestamp TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_sync_type CHECK (sync_type IN ('Workout', 'HeartRate', 'Weight', 'Sleep', 'Steps', 'Calories'))
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Exercise Database Indexes
CREATE INDEX IF NOT EXISTS idx_fitness_exercises_category ON fitness_exercises(category_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_fitness_exercises_equipment ON fitness_exercises(primary_equipment_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_fitness_exercises_custom ON fitness_exercises(is_custom, is_active);
CREATE INDEX IF NOT EXISTS idx_fitness_exercises_popularity ON fitness_exercises(popularity_score DESC) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_fitness_exercises_name ON fitness_exercises(name) WHERE is_active = TRUE;

-- Full-text search on exercise name and description
CREATE INDEX IF NOT EXISTS idx_fitness_exercises_search ON fitness_exercises USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Workout Template Indexes
CREATE INDEX IF NOT EXISTS idx_fitness_workout_templates_folder ON fitness_workout_templates(folder_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_fitness_workout_templates_favorite ON fitness_workout_templates(is_favorite) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_fitness_workout_templates_last_used ON fitness_workout_templates(last_used_at DESC) WHERE is_active = TRUE;

-- Workout Session Indexes
CREATE INDEX IF NOT EXISTS idx_fitness_workouts_started_at ON fitness_workouts(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_fitness_workouts_template ON fitness_workouts(template_id);
CREATE INDEX IF NOT EXISTS idx_fitness_workouts_completed ON fitness_workouts(is_completed, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_fitness_workouts_date ON fitness_workouts(DATE(started_at));

-- Workout Exercise and Set Indexes
CREATE INDEX IF NOT EXISTS idx_fitness_workout_exercises_workout ON fitness_workout_exercises(workout_id, exercise_order);
CREATE INDEX IF NOT EXISTS idx_fitness_workout_exercises_exercise ON fitness_workout_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_fitness_sets_workout_exercise ON fitness_sets(workout_exercise_id, set_number);
CREATE INDEX IF NOT EXISTS idx_fitness_sets_pr ON fitness_sets(is_personal_record) WHERE is_personal_record = TRUE;
CREATE INDEX IF NOT EXISTS idx_fitness_sets_completed_at ON fitness_sets(completed_at DESC);

-- Personal Records Indexes
CREATE INDEX IF NOT EXISTS idx_fitness_personal_records_exercise ON fitness_personal_records(exercise_id, record_type, achieved_at DESC);
CREATE INDEX IF NOT EXISTS idx_fitness_personal_records_achieved ON fitness_personal_records(achieved_at DESC);

-- Body Measurements Indexes
CREATE INDEX IF NOT EXISTS idx_fitness_body_measurements_date ON fitness_body_measurements(measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_fitness_body_measurements_weight ON fitness_body_measurements(weight_kg, measured_at DESC);

-- Progress Photos Indexes
CREATE INDEX IF NOT EXISTS idx_fitness_progress_photos_taken ON fitness_progress_photos(taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_fitness_progress_photos_measurement ON fitness_progress_photos(measurement_id);
CREATE INDEX IF NOT EXISTS idx_fitness_progress_photos_type ON fitness_progress_photos(photo_type, taken_at DESC);

-- Folder Indexes
CREATE INDEX IF NOT EXISTS idx_fitness_folders_parent ON fitness_folders(parent_folder_id, display_order);

-- Health Connect Indexes
CREATE INDEX IF NOT EXISTS idx_fitness_health_connect_type ON fitness_health_connect_sync(sync_type, synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_fitness_health_connect_processed ON fitness_health_connect_sync(is_processed) WHERE is_processed = FALSE;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp triggers
CREATE OR REPLACE FUNCTION update_fitness_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DROP TRIGGER IF EXISTS trigger_fitness_exercise_categories_updated_at ON fitness_exercise_categories;
CREATE TRIGGER trigger_fitness_exercise_categories_updated_at
  BEFORE UPDATE ON fitness_exercise_categories
  FOR EACH ROW EXECUTE FUNCTION update_fitness_updated_at();

DROP TRIGGER IF EXISTS trigger_fitness_muscle_groups_updated_at ON fitness_muscle_groups;
CREATE TRIGGER trigger_fitness_muscle_groups_updated_at
  BEFORE UPDATE ON fitness_muscle_groups
  FOR EACH ROW EXECUTE FUNCTION update_fitness_updated_at();

DROP TRIGGER IF EXISTS trigger_fitness_equipment_types_updated_at ON fitness_equipment_types;
CREATE TRIGGER trigger_fitness_equipment_types_updated_at
  BEFORE UPDATE ON fitness_equipment_types
  FOR EACH ROW EXECUTE FUNCTION update_fitness_updated_at();

DROP TRIGGER IF EXISTS trigger_fitness_exercises_updated_at ON fitness_exercises;
CREATE TRIGGER trigger_fitness_exercises_updated_at
  BEFORE UPDATE ON fitness_exercises
  FOR EACH ROW EXECUTE FUNCTION update_fitness_updated_at();

DROP TRIGGER IF EXISTS trigger_fitness_workout_templates_updated_at ON fitness_workout_templates;
CREATE TRIGGER trigger_fitness_workout_templates_updated_at
  BEFORE UPDATE ON fitness_workout_templates
  FOR EACH ROW EXECUTE FUNCTION update_fitness_updated_at();

DROP TRIGGER IF EXISTS trigger_fitness_template_exercises_updated_at ON fitness_template_exercises;
CREATE TRIGGER trigger_fitness_template_exercises_updated_at
  BEFORE UPDATE ON fitness_template_exercises
  FOR EACH ROW EXECUTE FUNCTION update_fitness_updated_at();

DROP TRIGGER IF EXISTS trigger_fitness_workouts_updated_at ON fitness_workouts;
CREATE TRIGGER trigger_fitness_workouts_updated_at
  BEFORE UPDATE ON fitness_workouts
  FOR EACH ROW EXECUTE FUNCTION update_fitness_updated_at();

DROP TRIGGER IF EXISTS trigger_fitness_folders_updated_at ON fitness_folders;
CREATE TRIGGER trigger_fitness_folders_updated_at
  BEFORE UPDATE ON fitness_folders
  FOR EACH ROW EXECUTE FUNCTION update_fitness_updated_at();

-- Auto-calculate workout duration
CREATE OR REPLACE FUNCTION calculate_workout_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_workout_duration ON fitness_workouts;
CREATE TRIGGER trigger_calculate_workout_duration
  BEFORE INSERT OR UPDATE ON fitness_workouts
  FOR EACH ROW EXECUTE FUNCTION calculate_workout_duration();

-- Auto-increment exercise popularity when used
CREATE OR REPLACE FUNCTION increment_exercise_popularity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE fitness_exercises
  SET popularity_score = popularity_score + 1
  WHERE id = NEW.exercise_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_exercise_popularity ON fitness_workout_exercises;
CREATE TRIGGER trigger_increment_exercise_popularity
  AFTER INSERT ON fitness_workout_exercises
  FOR EACH ROW EXECUTE FUNCTION increment_exercise_popularity();

-- Auto-update template last_used_at
CREATE OR REPLACE FUNCTION update_template_last_used()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.template_id IS NOT NULL THEN
    UPDATE fitness_workout_templates
    SET
      last_used_at = NEW.started_at,
      usage_count = usage_count + 1
    WHERE id = NEW.template_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_template_last_used ON fitness_workouts;
CREATE TRIGGER trigger_update_template_last_used
  AFTER INSERT ON fitness_workouts
  FOR EACH ROW EXECUTE FUNCTION update_template_last_used();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Calculate One Rep Max (Brzycki formula)
CREATE OR REPLACE FUNCTION calculate_one_rep_max(
  p_weight DECIMAL,
  p_reps INTEGER
)
RETURNS DECIMAL AS $$
BEGIN
  IF p_reps = 1 THEN
    RETURN p_weight;
  ELSIF p_reps > 1 AND p_reps <= 10 THEN
    -- Brzycki formula: 1RM = weight × (36 / (37 - reps))
    RETURN ROUND(p_weight * (36.0 / (37.0 - p_reps)), 2);
  ELSE
    -- For reps > 10, use Epley formula
    RETURN ROUND(p_weight * (1 + (p_reps / 30.0)), 2);
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get exercise history for an exercise
CREATE OR REPLACE FUNCTION get_exercise_history(
  p_exercise_id INTEGER,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  workout_date TIMESTAMPTZ,
  workout_name TEXT,
  set_number INTEGER,
  reps INTEGER,
  weight_kg DECIMAL,
  rpe INTEGER,
  one_rep_max DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.started_at,
    w.name,
    s.set_number,
    s.reps,
    s.weight_kg,
    s.rpe,
    calculate_one_rep_max(s.weight_kg, s.reps) as one_rep_max
  FROM fitness_sets s
  JOIN fitness_workout_exercises we ON s.workout_exercise_id = we.id
  JOIN fitness_workouts w ON we.workout_id = w.id
  WHERE we.exercise_id = p_exercise_id
    AND s.set_type != 'Warmup'
    AND w.is_completed = TRUE
  ORDER BY w.started_at DESC, s.set_number
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Get workout statistics
CREATE OR REPLACE FUNCTION get_workout_stats(
  p_workout_id INTEGER
)
RETURNS TABLE (
  total_sets BIGINT,
  total_reps BIGINT,
  total_volume_kg DECIMAL,
  exercises_count BIGINT,
  avg_rpe DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(s.id)::BIGINT as total_sets,
    SUM(s.reps)::BIGINT as total_reps,
    SUM(s.weight_kg * s.reps) as total_volume_kg,
    COUNT(DISTINCT we.exercise_id)::BIGINT as exercises_count,
    ROUND(AVG(s.rpe), 1) as avg_rpe
  FROM fitness_sets s
  JOIN fitness_workout_exercises we ON s.workout_exercise_id = we.id
  WHERE we.workout_id = p_workout_id
    AND s.set_type != 'Warmup';
END;
$$ LANGUAGE plpgsql;

-- Get personal best for exercise
CREATE OR REPLACE FUNCTION get_personal_best(
  p_exercise_id INTEGER,
  p_record_type TEXT DEFAULT 'One Rep Max'
)
RETURNS TABLE (
  record_value DECIMAL,
  achieved_at TIMESTAMPTZ,
  reps INTEGER,
  weight_kg DECIMAL
) AS $$
BEGIN
  IF p_record_type = 'One Rep Max' THEN
    RETURN QUERY
    SELECT
      MAX(calculate_one_rep_max(s.weight_kg, s.reps)) as record_value,
      (SELECT w.started_at
       FROM fitness_sets s2
       JOIN fitness_workout_exercises we2 ON s2.workout_exercise_id = we2.id
       JOIN fitness_workouts w ON we2.workout_id = w.id
       WHERE we2.exercise_id = p_exercise_id
         AND s2.set_type != 'Warmup'
         AND calculate_one_rep_max(s2.weight_kg, s2.reps) = MAX(calculate_one_rep_max(s.weight_kg, s.reps))
       LIMIT 1) as achieved_at,
      (SELECT s2.reps
       FROM fitness_sets s2
       JOIN fitness_workout_exercises we2 ON s2.workout_exercise_id = we2.id
       WHERE we2.exercise_id = p_exercise_id
         AND s2.set_type != 'Warmup'
         AND calculate_one_rep_max(s2.weight_kg, s2.reps) = MAX(calculate_one_rep_max(s.weight_kg, s.reps))
       LIMIT 1) as reps,
      (SELECT s2.weight_kg
       FROM fitness_sets s2
       JOIN fitness_workout_exercises we2 ON s2.workout_exercise_id = we2.id
       WHERE we2.exercise_id = p_exercise_id
         AND s2.set_type != 'Warmup'
         AND calculate_one_rep_max(s2.weight_kg, s2.reps) = MAX(calculate_one_rep_max(s.weight_kg, s.reps))
       LIMIT 1) as weight_kg
    FROM fitness_sets s
    JOIN fitness_workout_exercises we ON s.workout_exercise_id = we.id
    WHERE we.exercise_id = p_exercise_id
      AND s.set_type != 'Warmup'
      AND s.weight_kg IS NOT NULL
      AND s.reps IS NOT NULL;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TABLE COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE fitness_exercise_categories IS 'Exercise categories (Strength, Cardio, Flexibility, etc.)';
COMMENT ON TABLE fitness_muscle_groups IS 'Muscle groups targeted by exercises';
COMMENT ON TABLE fitness_equipment_types IS 'Equipment types (Barbell, Dumbbell, Machine, etc.)';
COMMENT ON TABLE fitness_exercises IS 'Exercise database with instructions and media';
COMMENT ON TABLE fitness_exercise_muscle_groups IS 'Many-to-many mapping of exercises to muscle groups';
COMMENT ON TABLE fitness_workout_templates IS 'Reusable workout templates/programs';
COMMENT ON TABLE fitness_template_exercises IS 'Exercises within a workout template';
COMMENT ON TABLE fitness_workouts IS 'Actual workout sessions';
COMMENT ON TABLE fitness_workout_exercises IS 'Exercises performed in a workout';
COMMENT ON TABLE fitness_sets IS 'Individual sets with reps, weight, RPE, etc.';
COMMENT ON TABLE fitness_folders IS 'Organizational folders for templates';
COMMENT ON TABLE fitness_personal_records IS 'Personal records for exercises';
COMMENT ON TABLE fitness_body_measurements IS 'Body weight and circumference measurements';
COMMENT ON TABLE fitness_progress_photos IS 'Progress photos with metadata';
COMMENT ON TABLE fitness_health_connect_sync IS 'Health Connect / Wear OS data sync';

-- ============================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================

ANALYZE fitness_exercise_categories;
ANALYZE fitness_muscle_groups;
ANALYZE fitness_equipment_types;
ANALYZE fitness_exercises;
ANALYZE fitness_exercise_muscle_groups;
ANALYZE fitness_workout_templates;
ANALYZE fitness_template_exercises;
ANALYZE fitness_workouts;
ANALYZE fitness_workout_exercises;
ANALYZE fitness_sets;
ANALYZE fitness_folders;
ANALYZE fitness_personal_records;
ANALYZE fitness_body_measurements;
ANALYZE fitness_progress_photos;
ANALYZE fitness_health_connect_sync;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
