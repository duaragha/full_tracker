-- Migration: Extend fitness workouts metadata and add health metrics storage

-- Add source tracking columns to fitness_workouts
ALTER TABLE fitness_workouts
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS source_id TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Ensure source column uses approved values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.constraint_column_usage
    WHERE table_name = 'fitness_workouts'
      AND constraint_name = 'fitness_workouts_valid_source'
  ) THEN
    ALTER TABLE fitness_workouts
      ADD CONSTRAINT fitness_workouts_valid_source
      CHECK (source IN ('web', 'wear_os', 'health_connect', 'ios', 'manual'));
  END IF;
END;
$$;

-- Health metrics table for heart rate, steps, etc.
CREATE TABLE IF NOT EXISTS fitness_health_metrics (
  id SERIAL PRIMARY KEY,

  metric_type TEXT NOT NULL CHECK (metric_type IN (
    'heart_rate',
    'resting_heart_rate',
    'steps',
    'distance',
    'calories_burned',
    'sleep_duration',
    'vo2_max'
  )),
  value DECIMAL(10, 2) NOT NULL,
  unit TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  source TEXT NOT NULL DEFAULT 'health_connect' CHECK (
    source IN ('wear_os', 'health_connect', 'manual', 'ios', 'android')
  ),
  device_id TEXT,
  workout_id INTEGER REFERENCES fitness_workouts(id) ON DELETE SET NULL,

  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_fitness_health_metrics_type
  ON fitness_health_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_fitness_health_metrics_recorded_at
  ON fitness_health_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_fitness_health_metrics_source
  ON fitness_health_metrics(source);
CREATE INDEX IF NOT EXISTS idx_fitness_health_metrics_workout
  ON fitness_health_metrics(workout_id);
