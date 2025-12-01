-- Migration: Add fitness tracking tables
-- Description: Add tables for workout tracking, exercises, routines, and progress

-- 1. Exercise library table
CREATE TABLE IF NOT EXISTS exercises (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  primary_muscle VARCHAR(100),
  secondary_muscles TEXT[],
  equipment VARCHAR(100),
  difficulty VARCHAR(20),
  instructions TEXT,
  video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Routine folders for organization
CREATE TABLE IF NOT EXISTS routine_folders (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(7),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Workout routines (templates)
CREATE TABLE IF NOT EXISTS workout_routines (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  folder_id INTEGER REFERENCES routine_folders(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Routine exercises (exercises in a routine)
CREATE TABLE IF NOT EXISTS routine_exercises (
  id SERIAL PRIMARY KEY,
  routine_id INTEGER REFERENCES workout_routines(id) ON DELETE CASCADE,
  exercise_id INTEGER REFERENCES exercises(id),
  exercise_order INTEGER NOT NULL,
  sets_count INTEGER DEFAULT 3,
  target_reps VARCHAR(20),
  target_weight DECIMAL(6,2),
  rest_seconds INTEGER DEFAULT 90,
  notes TEXT,
  superset_group INTEGER
);

-- 5. Workout sessions (actual workouts)
CREATE TABLE IF NOT EXISTS workout_sessions (
  id SERIAL PRIMARY KEY,
  routine_id INTEGER REFERENCES workout_routines(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  notes TEXT,
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),
  body_weight DECIMAL(5,2),
  source VARCHAR(20) DEFAULT 'web',
  source_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Workout sets (individual sets)
CREATE TABLE IF NOT EXISTS workout_sets (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id INTEGER REFERENCES exercises(id),
  set_number INTEGER NOT NULL,
  reps INTEGER,
  weight_kg DECIMAL(6,2),
  distance_meters INTEGER,
  duration_seconds INTEGER,
  rpe DECIMAL(3,1) CHECK (rpe BETWEEN 1 AND 10),
  set_type VARCHAR(20) DEFAULT 'normal',
  is_personal_record BOOLEAN DEFAULT false,
  notes TEXT,
  heart_rate_avg INTEGER,
  heart_rate_max INTEGER,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Personal records
CREATE TABLE IF NOT EXISTS personal_records (
  id SERIAL PRIMARY KEY,
  exercise_id INTEGER REFERENCES exercises(id),
  record_type VARCHAR(50),
  value DECIMAL(10,2),
  set_id INTEGER REFERENCES workout_sets(id),
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Body measurements
CREATE TABLE IF NOT EXISTS body_measurements (
  id SERIAL PRIMARY KEY,
  measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight DECIMAL(5,2),
  body_fat_percentage DECIMAL(4,2),
  muscle_mass DECIMAL(5,2),
  chest DECIMAL(5,2),
  waist DECIMAL(5,2),
  hips DECIMAL(5,2),
  left_arm DECIMAL(5,2),
  right_arm DECIMAL(5,2),
  left_thigh DECIMAL(5,2),
  right_thigh DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_workout_sessions_started_at ON workout_sessions(started_at DESC);
CREATE INDEX idx_workout_sets_session_id ON workout_sets(session_id);
CREATE INDEX idx_workout_sets_exercise_id ON workout_sets(exercise_id);
CREATE INDEX idx_personal_records_exercise_id ON personal_records(exercise_id);
CREATE INDEX idx_routine_exercises_routine_id ON routine_exercises(routine_id);

-- Insert default exercise categories and sample exercises
INSERT INTO exercises (name, category, primary_muscle, secondary_muscles, equipment, difficulty, instructions) VALUES
-- Chest
('Barbell Bench Press', 'Barbell', 'Chest', ARRAY['Triceps', 'Shoulders'], 'Barbell', 'Intermediate',
 '1. Lie on bench with eyes under bar
2. Grip bar slightly wider than shoulders
3. Lower bar to chest with control
4. Press bar back up to starting position'),
('Incline Dumbbell Press', 'Dumbbell', 'Chest', ARRAY['Triceps', 'Shoulders'], 'Dumbbells', 'Intermediate',
 '1. Set bench to 30-45 degree incline
2. Hold dumbbells at chest level
3. Press dumbbells up and together
4. Lower with control'),
('Push-up', 'Bodyweight', 'Chest', ARRAY['Triceps', 'Shoulders', 'Core'], 'None', 'Beginner',
 '1. Start in plank position
2. Lower body until chest nearly touches floor
3. Push back up to starting position'),

-- Back
('Pull-up', 'Bodyweight', 'Back', ARRAY['Biceps', 'Core'], 'Pull-up Bar', 'Intermediate',
 '1. Hang from bar with overhand grip
2. Pull body up until chin over bar
3. Lower with control'),
('Barbell Row', 'Barbell', 'Back', ARRAY['Biceps', 'Core'], 'Barbell', 'Intermediate',
 '1. Hinge at hips with barbell in hands
2. Row bar to lower chest
3. Squeeze shoulder blades together
4. Lower with control'),
('Deadlift', 'Barbell', 'Back', ARRAY['Glutes', 'Hamstrings', 'Core'], 'Barbell', 'Advanced',
 '1. Stand with feet hip-width apart
2. Bend at hips and knees to grip bar
3. Lift bar by extending hips and knees
4. Stand tall, then lower with control'),

-- Legs
('Barbell Squat', 'Barbell', 'Quadriceps', ARRAY['Glutes', 'Core'], 'Barbell', 'Intermediate',
 '1. Position bar on upper back
2. Squat down until thighs parallel
3. Drive through heels to stand
4. Keep chest up throughout'),
('Romanian Deadlift', 'Barbell', 'Hamstrings', ARRAY['Glutes', 'Back'], 'Barbell', 'Intermediate',
 '1. Hold bar at hip level
2. Push hips back while lowering bar
3. Feel stretch in hamstrings
4. Return to starting position'),
('Walking Lunge', 'Dumbbell', 'Quadriceps', ARRAY['Glutes', 'Hamstrings'], 'Dumbbells', 'Intermediate',
 '1. Hold dumbbells at sides
2. Step forward into lunge
3. Push off front foot
4. Step forward with opposite leg'),

-- Shoulders
('Overhead Press', 'Barbell', 'Shoulders', ARRAY['Triceps', 'Core'], 'Barbell', 'Intermediate',
 '1. Hold bar at shoulder level
2. Press bar overhead
3. Lock out arms at top
4. Lower with control'),
('Lateral Raise', 'Dumbbell', 'Shoulders', NULL, 'Dumbbells', 'Beginner',
 '1. Hold dumbbells at sides
2. Raise arms to sides
3. Stop at shoulder height
4. Lower with control'),

-- Arms
('Barbell Curl', 'Barbell', 'Biceps', NULL, 'Barbell', 'Beginner',
 '1. Hold bar with underhand grip
2. Curl bar to chest
3. Squeeze biceps at top
4. Lower with control'),
('Hammer Curl', 'Dumbbell', 'Biceps', ARRAY['Forearms'], 'Dumbbells', 'Beginner',
 '1. Hold dumbbells with neutral grip
2. Curl weights to shoulders
3. Keep elbows at sides
4. Lower with control'),
('Tricep Dips', 'Bodyweight', 'Triceps', ARRAY['Chest', 'Shoulders'], 'Dip Bars', 'Intermediate',
 '1. Support body on dip bars
2. Lower body by bending elbows
3. Press back up to start'),

-- Core
('Plank', 'Bodyweight', 'Abs', ARRAY['Core', 'Shoulders'], 'None', 'Beginner',
 '1. Start in pushup position on forearms
2. Keep body in straight line
3. Engage core and hold
4. Breathe normally');

-- Insert default routine folders
INSERT INTO routine_folders (name, icon, color) VALUES
('Push/Pull/Legs', '💪', '#3B82F6'),
('Upper/Lower', '🏋️', '#10B981'),
('Full Body', '🎯', '#F59E0B'),
('Strength', '⚡', '#EF4444'),
('Custom', '⭐', '#8B5CF6');

-- Insert sample routines
INSERT INTO workout_routines (name, description, folder_id) VALUES
('Push Day', 'Chest, Shoulders, Triceps', 1),
('Pull Day', 'Back and Biceps', 1),
('Leg Day', 'Quadriceps, Hamstrings, Glutes', 1),
('Upper Body', 'Complete upper body workout', 2),
('Lower Body', 'Complete lower body workout', 2),
('Full Body Beginner', 'Great for beginners', 3);

-- Add exercises to Push Day routine
INSERT INTO routine_exercises (routine_id, exercise_id, exercise_order, sets_count, target_reps, rest_seconds)
SELECT
  1 as routine_id,
  e.id as exercise_id,
  ROW_NUMBER() OVER (ORDER BY
    CASE e.name
      WHEN 'Barbell Bench Press' THEN 1
      WHEN 'Incline Dumbbell Press' THEN 2
      WHEN 'Overhead Press' THEN 3
      WHEN 'Lateral Raise' THEN 4
      WHEN 'Tricep Dips' THEN 5
    END
  ) as exercise_order,
  CASE e.name
    WHEN 'Barbell Bench Press' THEN 4
    WHEN 'Incline Dumbbell Press' THEN 3
    WHEN 'Overhead Press' THEN 4
    WHEN 'Lateral Raise' THEN 3
    WHEN 'Tricep Dips' THEN 3
  END as sets_count,
  CASE e.name
    WHEN 'Barbell Bench Press' THEN '6-8'
    WHEN 'Incline Dumbbell Press' THEN '8-10'
    WHEN 'Overhead Press' THEN '8-10'
    WHEN 'Lateral Raise' THEN '12-15'
    WHEN 'Tricep Dips' THEN '8-12'
  END as target_reps,
  CASE e.name
    WHEN 'Barbell Bench Press' THEN 180
    WHEN 'Incline Dumbbell Press' THEN 120
    WHEN 'Overhead Press' THEN 150
    ELSE 90
  END as rest_seconds
FROM exercises e
WHERE e.name IN ('Barbell Bench Press', 'Incline Dumbbell Press', 'Overhead Press', 'Lateral Raise', 'Tricep Dips');

-- Add exercises to Pull Day routine
INSERT INTO routine_exercises (routine_id, exercise_id, exercise_order, sets_count, target_reps, rest_seconds)
SELECT
  2 as routine_id,
  e.id as exercise_id,
  ROW_NUMBER() OVER (ORDER BY
    CASE e.name
      WHEN 'Deadlift' THEN 1
      WHEN 'Pull-up' THEN 2
      WHEN 'Barbell Row' THEN 3
      WHEN 'Barbell Curl' THEN 4
      WHEN 'Hammer Curl' THEN 5
    END
  ) as exercise_order,
  CASE e.name
    WHEN 'Deadlift' THEN 3
    WHEN 'Pull-up' THEN 4
    WHEN 'Barbell Row' THEN 3
    WHEN 'Barbell Curl' THEN 4
    WHEN 'Hammer Curl' THEN 3
  END as sets_count,
  CASE e.name
    WHEN 'Deadlift' THEN '5-6'
    WHEN 'Pull-up' THEN '8-12'
    WHEN 'Barbell Row' THEN '8-10'
    WHEN 'Barbell Curl' THEN '10-12'
    WHEN 'Hammer Curl' THEN '12-15'
  END as target_reps,
  CASE e.name
    WHEN 'Deadlift' THEN 240
    ELSE 120
  END as rest_seconds
FROM exercises e
WHERE e.name IN ('Deadlift', 'Pull-up', 'Barbell Row', 'Barbell Curl', 'Hammer Curl');

-- Add exercises to Leg Day routine
INSERT INTO routine_exercises (routine_id, exercise_id, exercise_order, sets_count, target_reps, rest_seconds)
SELECT
  3 as routine_id,
  e.id as exercise_id,
  ROW_NUMBER() OVER (ORDER BY
    CASE e.name
      WHEN 'Barbell Squat' THEN 1
      WHEN 'Romanian Deadlift' THEN 2
      WHEN 'Walking Lunge' THEN 3
    END
  ) as exercise_order,
  CASE e.name
    WHEN 'Barbell Squat' THEN 4
    WHEN 'Romanian Deadlift' THEN 3
    WHEN 'Walking Lunge' THEN 3
  END as sets_count,
  CASE e.name
    WHEN 'Barbell Squat' THEN '6-8'
    WHEN 'Romanian Deadlift' THEN '8-10'
    WHEN 'Walking Lunge' THEN '10-12'
  END as target_reps,
  CASE e.name
    WHEN 'Barbell Squat' THEN 180
    WHEN 'Romanian Deadlift' THEN 150
    ELSE 90
  END as rest_seconds
FROM exercises e
WHERE e.name IN ('Barbell Squat', 'Romanian Deadlift', 'Walking Lunge');