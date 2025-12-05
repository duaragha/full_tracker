-- Migration: Add weight metric type to fitness_health_metrics

-- Drop and recreate the CHECK constraint to include 'weight'
ALTER TABLE fitness_health_metrics
  DROP CONSTRAINT IF EXISTS fitness_health_metrics_metric_type_check;

ALTER TABLE fitness_health_metrics
  ADD CONSTRAINT fitness_health_metrics_metric_type_check
  CHECK (metric_type IN (
    'heart_rate',
    'resting_heart_rate',
    'steps',
    'distance',
    'calories_burned',
    'sleep_duration',
    'vo2_max',
    'weight'
  ));
