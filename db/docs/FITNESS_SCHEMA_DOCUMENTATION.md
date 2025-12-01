# Fitness Tracking Database Schema Documentation

## Overview

Comprehensive PostgreSQL database schema for tracking workouts, exercises, progress, and body measurements. Designed to integrate seamlessly with the existing full_tracker application while being future-proof for Wear OS and Health Connect integration.

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Core Tables](#core-tables)
3. [Relationships](#relationships)
4. [Indexes and Performance](#indexes-and-performance)
5. [Helper Functions](#helper-functions)
6. [Integration Points](#integration-points)
7. [API Design Recommendations](#api-design-recommendations)
8. [Query Examples](#query-examples)

## Schema Overview

### Database Tables (15 total)

#### Exercise Database (4 tables)
- `fitness_exercise_categories` - Exercise categories (Strength, Cardio, etc.)
- `fitness_muscle_groups` - Muscle groups (Chest, Back, Legs, etc.)
- `fitness_equipment_types` - Equipment types (Barbell, Dumbbell, etc.)
- `fitness_exercises` - Exercise database with instructions and media
- `fitness_exercise_muscle_groups` - Many-to-many exercise-to-muscle mapping

#### Workout Tracking (5 tables)
- `fitness_workout_templates` - Reusable workout routines/programs
- `fitness_template_exercises` - Exercises within templates
- `fitness_workouts` - Actual workout sessions
- `fitness_workout_exercises` - Exercises performed in workouts
- `fitness_sets` - Individual sets with reps, weight, RPE

#### Organization (1 table)
- `fitness_folders` - Hierarchical folder structure for templates

#### Progress Tracking (4 tables)
- `fitness_personal_records` - Personal records for exercises
- `fitness_body_measurements` - Weight and circumference measurements
- `fitness_progress_photos` - Progress photos with metadata
- `fitness_health_connect_sync` - Health Connect/Wear OS sync data

---

## Core Tables

### 1. fitness_exercises

Central table containing all exercises (system and custom).

**Key Fields:**
- `name` - Exercise name
- `description` - Brief description
- `instructions` - Step-by-step instructions
- `category_id` - Links to exercise category
- `primary_equipment_id` - Main equipment required
- `difficulty_level` - Beginner, Intermediate, Advanced
- `force_type` - Push, Pull, Static
- `mechanics_type` - Compound, Isolation
- `is_custom` - User-created vs system exercise
- `popularity_score` - Auto-incremented when used

**Usage Example:**
```sql
-- Get all barbell chest exercises
SELECT e.name, e.difficulty_level, ec.name as category
FROM fitness_exercises e
JOIN fitness_exercise_categories ec ON e.category_id = ec.id
JOIN fitness_equipment_types et ON e.primary_equipment_id = et.id
WHERE et.name = 'Barbell'
  AND e.id IN (
    SELECT exercise_id FROM fitness_exercise_muscle_groups
    JOIN fitness_muscle_groups ON muscle_group_id = fitness_muscle_groups.id
    WHERE fitness_muscle_groups.name = 'Chest'
  )
  AND e.is_active = TRUE;
```

### 2. fitness_workouts

Tracks actual workout sessions.

**Key Fields:**
- `started_at` - When workout began
- `ended_at` - When workout completed
- `duration_minutes` - Auto-calculated
- `template_id` - Optional link to template used
- `bodyweight_kg` - User's weight at time of workout
- `pre_workout_energy_level` - 1-10 scale
- `post_workout_energy_level` - 1-10 scale
- `total_volume_kg` - Total weight lifted (aggregate)
- `health_connect_session_id` - For Wear OS integration

**Auto-calculated Fields:**
- `duration_minutes` - Calculated via trigger from `ended_at - started_at`

**Usage Example:**
```sql
-- Get workout summary with stats
SELECT
  w.id,
  w.name,
  w.started_at,
  w.duration_minutes,
  COUNT(DISTINCT we.exercise_id) as exercise_count,
  COUNT(s.id) as total_sets,
  SUM(s.reps) as total_reps,
  SUM(s.weight_kg * s.reps) as total_volume_kg
FROM fitness_workouts w
LEFT JOIN fitness_workout_exercises we ON w.id = we.workout_id
LEFT JOIN fitness_sets s ON we.id = s.workout_exercise_id
WHERE w.is_completed = TRUE
  AND w.started_at >= NOW() - INTERVAL '30 days'
GROUP BY w.id
ORDER BY w.started_at DESC;
```

### 3. fitness_sets

Individual sets with detailed metrics.

**Key Fields:**
- `set_number` - Sequential set number
- `set_type` - Normal, Warmup, Drop, Failure, AMRAP
- `reps` - Repetitions completed
- `weight_kg` - Weight used
- `duration_seconds` - For timed exercises
- `distance_meters` - For cardio/running
- `rpe` - Rate of Perceived Exertion (1-10)
- `is_personal_record` - Flag for PR tracking
- `is_failed` - Did not complete target reps

**Constraints:**
- Unique combination of `workout_exercise_id` and `set_number`
- RPE must be between 1-10
- Weight, duration, distance must be positive

**Usage Example:**
```sql
-- Record a set
INSERT INTO fitness_sets (
  workout_exercise_id,
  set_number,
  set_type,
  reps,
  weight_kg,
  rpe
) VALUES (
  123,  -- workout_exercise_id
  1,    -- first set
  'Normal',
  8,    -- 8 reps
  100.0, -- 100kg
  7     -- RPE 7
);
```

### 4. fitness_workout_templates

Reusable workout programs.

**Key Fields:**
- `name` - Template name
- `folder_id` - Optional folder organization
- `difficulty_level` - Beginner, Intermediate, Advanced
- `primary_goal` - Strength, Hypertrophy, Endurance, etc.
- `estimated_duration_minutes` - Expected workout length
- `is_favorite` - Quick access flag
- `last_used_at` - Auto-updated when used
- `usage_count` - Auto-incremented when used

**Auto-behavior:**
- When a workout is created from template, `last_used_at` and `usage_count` are updated automatically via trigger

### 5. fitness_personal_records

Tracks personal bests for exercises.

**Key Fields:**
- `exercise_id` - Exercise reference
- `record_type` - One Rep Max, Volume, Reps, Distance, Duration
- `weight_kg`, `reps`, `duration_seconds`, `distance_meters`, `volume_kg`
- `achieved_at` - When record was set
- `workout_id`, `set_id` - Links to source workout/set

**Usage Example:**
```sql
-- Get all-time best 1RM for squat
SELECT
  pr.weight_kg,
  pr.reps,
  calculate_one_rep_max(pr.weight_kg, pr.reps) as estimated_1rm,
  pr.achieved_at
FROM fitness_personal_records pr
JOIN fitness_exercises e ON pr.exercise_id = e.id
WHERE e.name = 'Barbell Squat'
  AND pr.record_type = 'One Rep Max'
ORDER BY pr.achieved_at DESC
LIMIT 1;
```

### 6. fitness_body_measurements

Body metrics tracking.

**Key Fields:**
- `measured_at` - Measurement timestamp
- `weight_kg` - Body weight
- `body_fat_percentage` - BF%
- `muscle_mass_kg` - Lean muscle mass
- Circumferences: `neck_cm`, `chest_cm`, `waist_cm`, `hips_cm`, `bicep_cm`, `thigh_cm`, `calf_cm`
- `bmi` - Body Mass Index
- `health_connect_record_id` - For sync with Health Connect

---

## Relationships

### Exercise Hierarchy
```
fitness_exercise_categories (1:N) fitness_exercises
fitness_equipment_types (1:N) fitness_exercises
fitness_exercises (N:M) fitness_muscle_groups
  via fitness_exercise_muscle_groups
```

### Workout Structure
```
fitness_folders (1:N) fitness_workout_templates
fitness_workout_templates (1:N) fitness_template_exercises
fitness_template_exercises (N:1) fitness_exercises

fitness_workouts (1:N) fitness_workout_exercises
fitness_workout_exercises (N:1) fitness_exercises
fitness_workout_exercises (1:N) fitness_sets
```

### Progress Tracking
```
fitness_exercises (1:N) fitness_personal_records
fitness_body_measurements (1:N) fitness_progress_photos
fitness_workouts (1:1) fitness_health_connect_sync
```

### Foreign Key Cascade Rules

**DELETE CASCADE:**
- Deleting a workout → deletes all workout_exercises and sets
- Deleting a template → deletes all template_exercises
- Deleting a folder → deletes contained templates

**SET NULL:**
- Deleting equipment type → sets `primary_equipment_id` to NULL
- Deleting category → sets `category_id` to NULL
- Deleting template → keeps workout but sets `template_id` to NULL

---

## Indexes and Performance

### Critical Indexes

**Exercise Discovery:**
```sql
idx_fitness_exercises_category     -- Filter by category
idx_fitness_exercises_equipment    -- Filter by equipment
idx_fitness_exercises_search       -- Full-text search on name/description
idx_fitness_exercises_popularity   -- Sort by most used
```

**Workout Queries:**
```sql
idx_fitness_workouts_started_at    -- Date-based filtering (DESC for recent)
idx_fitness_workouts_date          -- Group by date
idx_fitness_workouts_completed     -- Filter completed workouts
```

**Set Performance:**
```sql
idx_fitness_sets_workout_exercise  -- Fast set retrieval for exercise
idx_fitness_sets_completed_at      -- Recent sets
idx_fitness_sets_pr               -- Personal record filtering
```

**Template Access:**
```sql
idx_fitness_workout_templates_favorite  -- Quick access favorites
idx_fitness_workout_templates_last_used -- Recently used templates
```

### Query Optimization Tips

1. **Always include `is_active = TRUE`** in WHERE clauses for exercises
2. **Use date ranges** with indexes: `WHERE started_at >= ? AND started_at < ?`
3. **Leverage partial indexes** for common filters (completed workouts, active exercises)
4. **Use EXPLAIN ANALYZE** to verify index usage

### Performance Benchmarks

Expected query performance (with proper indexes):

| Query Type | Expected Response Time |
|------------|------------------------|
| Exercise search | < 10ms |
| Workout list (30 days) | < 20ms |
| Workout detail with sets | < 30ms |
| Personal record calculation | < 50ms |
| Body measurement history | < 15ms |

---

## Helper Functions

### 1. calculate_one_rep_max(weight, reps)

Estimates 1RM using Brzycki formula (1-10 reps) or Epley formula (>10 reps).

```sql
-- Example: Calculate 1RM for 100kg x 8 reps
SELECT calculate_one_rep_max(100, 8);  -- Returns ~125kg
```

### 2. get_exercise_history(exercise_id, limit)

Returns recent performance history for an exercise.

```sql
-- Get last 10 sets of bench press
SELECT * FROM get_exercise_history(
  (SELECT id FROM fitness_exercises WHERE name = 'Barbell Bench Press'),
  10
);
```

Returns:
- `workout_date` - When performed
- `workout_name` - Workout name
- `set_number` - Which set
- `reps`, `weight_kg`, `rpe` - Performance metrics
- `one_rep_max` - Calculated 1RM

### 3. get_workout_stats(workout_id)

Aggregates statistics for a workout.

```sql
SELECT * FROM get_workout_stats(123);
```

Returns:
- `total_sets` - Number of sets (excluding warmup)
- `total_reps` - Sum of all reps
- `total_volume_kg` - Total weight × reps
- `exercises_count` - Unique exercises
- `avg_rpe` - Average RPE

### 4. get_personal_best(exercise_id, record_type)

Gets current personal record for an exercise.

```sql
SELECT * FROM get_personal_best(
  (SELECT id FROM fitness_exercises WHERE name = 'Barbell Squat'),
  'One Rep Max'
);
```

---

## Integration Points

### 1. User Authentication (Future)

When user authentication is added:

```sql
ALTER TABLE fitness_exercises ADD COLUMN user_id INTEGER REFERENCES users(id);
ALTER TABLE fitness_workouts ADD COLUMN user_id INTEGER NOT NULL REFERENCES users(id);
ALTER TABLE fitness_body_measurements ADD COLUMN user_id INTEGER NOT NULL REFERENCES users(id);

-- Add indexes
CREATE INDEX idx_fitness_exercises_user ON fitness_exercises(user_id);
CREATE INDEX idx_fitness_workouts_user ON fitness_workouts(user_id, started_at DESC);
```

### 2. Media Storage Integration

Store exercise videos and progress photos:

**Recommended approach:**
- Store files in cloud storage (S3, Cloudflare R2, etc.)
- Store URLs in database
- Use signed URLs for private content

```typescript
// Example: Upload progress photo
async function uploadProgressPhoto(file: File, measurementId: number) {
  const url = await uploadToCloudStorage(file);

  await db.query(`
    INSERT INTO fitness_progress_photos (
      photo_url, photo_type, measurement_id, taken_at
    ) VALUES ($1, $2, $3, NOW())
  `, [url, 'Front', measurementId]);
}
```

### 3. Wear OS / Health Connect Integration

**Data Flow:**
1. Wear OS app → Health Connect API → Sync service
2. Store raw data in `fitness_health_connect_sync`
3. Process and map to `fitness_workouts` and `fitness_sets`

```typescript
// Example sync structure
interface HealthConnectWorkout {
  sessionId: string;
  startTime: string;
  endTime: string;
  exerciseType: string;
  heartRateData: number[];
  caloriesBurned: number;
}

async function syncHealthConnectWorkout(data: HealthConnectWorkout) {
  // Store raw data
  await db.query(`
    INSERT INTO fitness_health_connect_sync (
      sync_type, health_connect_id, raw_data, health_connect_timestamp
    ) VALUES ('Workout', $1, $2, $3)
  `, [data.sessionId, JSON.stringify(data), data.startTime]);

  // Process and create workout record
  const workoutId = await createWorkoutFromHealthConnect(data);

  // Link sync record to workout
  await db.query(`
    UPDATE fitness_health_connect_sync
    SET mapped_workout_id = $1, is_processed = TRUE, processed_at = NOW()
    WHERE health_connect_id = $2
  `, [workoutId, data.sessionId]);
}
```

### 4. Existing Tables Integration

**Link to existing user data:**

```sql
-- Example: Track fitness goals alongside job applications
CREATE TABLE fitness_goals (
  id SERIAL PRIMARY KEY,
  goal_type TEXT NOT NULL,  -- Weight Loss, Muscle Gain, Strength, etc.
  target_value DECIMAL(10, 2),
  target_date DATE,
  current_value DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link workouts to calendar events (if you add a calendar)
ALTER TABLE fitness_workouts ADD COLUMN calendar_event_id INTEGER;
```

---

## API Design Recommendations

### RESTful Endpoints

#### Exercises
```
GET    /api/fitness/exercises              - List exercises (with filters)
GET    /api/fitness/exercises/:id          - Get exercise details
POST   /api/fitness/exercises              - Create custom exercise
PUT    /api/fitness/exercises/:id          - Update exercise
DELETE /api/fitness/exercises/:id          - Delete custom exercise

GET    /api/fitness/exercises/:id/history  - Exercise performance history
GET    /api/fitness/exercises/:id/pr       - Personal records for exercise
```

#### Workouts
```
GET    /api/fitness/workouts               - List workouts
GET    /api/fitness/workouts/:id           - Get workout details with sets
POST   /api/fitness/workouts               - Start new workout
PUT    /api/fitness/workouts/:id           - Update workout
DELETE /api/fitness/workouts/:id           - Delete workout
POST   /api/fitness/workouts/:id/complete  - Mark workout as completed

POST   /api/fitness/workouts/:id/exercises - Add exercise to workout
POST   /api/fitness/workouts/:id/sets      - Add set to workout
```

#### Templates
```
GET    /api/fitness/templates              - List templates
GET    /api/fitness/templates/:id          - Get template details
POST   /api/fitness/templates              - Create template
PUT    /api/fitness/templates/:id          - Update template
DELETE /api/fitness/templates/:id          - Delete template

POST   /api/fitness/templates/:id/start    - Start workout from template
```

#### Progress
```
GET    /api/fitness/measurements           - Get body measurements
POST   /api/fitness/measurements           - Add measurement
PUT    /api/fitness/measurements/:id       - Update measurement

GET    /api/fitness/photos                 - Get progress photos
POST   /api/fitness/photos                 - Upload progress photo
DELETE /api/fitness/photos/:id             - Delete photo

GET    /api/fitness/records                - Get all personal records
GET    /api/fitness/records/:exerciseId    - Get records for exercise
```

#### Statistics
```
GET    /api/fitness/stats/overview         - Overall fitness stats
GET    /api/fitness/stats/volume           - Volume trends over time
GET    /api/fitness/stats/frequency        - Workout frequency analysis
GET    /api/fitness/stats/muscle-groups    - Muscle group distribution
```

### Request/Response Examples

#### Start Workout from Template
```typescript
POST /api/fitness/workouts

Request:
{
  "template_id": 42,
  "name": "Upper Body Push",
  "started_at": "2025-11-14T10:00:00Z",
  "bodyweight_kg": 80.5,
  "pre_workout_energy_level": 7
}

Response: {
  "id": 1234,
  "name": "Upper Body Push",
  "template_id": 42,
  "started_at": "2025-11-14T10:00:00Z",
  "exercises": [
    {
      "id": 5678,
      "exercise": {
        "id": 1,
        "name": "Barbell Bench Press",
        "primary_muscles": ["Chest"]
      },
      "target_sets": 4,
      "target_reps_min": 8,
      "target_reps_max": 12,
      "target_weight": 100
    }
  ]
}
```

#### Add Set to Workout
```typescript
POST /api/fitness/workouts/1234/sets

Request:
{
  "workout_exercise_id": 5678,
  "set_number": 1,
  "set_type": "Normal",
  "reps": 10,
  "weight_kg": 100,
  "rpe": 7
}

Response: {
  "id": 9012,
  "set_number": 1,
  "reps": 10,
  "weight_kg": 100,
  "rpe": 7,
  "estimated_1rm": 133.3,
  "is_personal_record": false,
  "completed_at": "2025-11-14T10:15:23Z"
}
```

### API Query Parameters

**Exercise Filtering:**
```
GET /api/fitness/exercises?
  category=Strength&
  equipment=Barbell&
  muscle_group=Chest&
  difficulty=Intermediate&
  search=bench
```

**Workout Filtering:**
```
GET /api/fitness/workouts?
  start_date=2025-01-01&
  end_date=2025-01-31&
  completed=true&
  template_id=42&
  sort=started_at&
  order=desc&
  limit=50&
  offset=0
```

---

## Query Examples

### 1. Workout Summary Dashboard
```sql
SELECT
  DATE(w.started_at) as workout_date,
  COUNT(w.id) as workouts_count,
  SUM(w.duration_minutes) as total_minutes,
  SUM(w.total_volume_kg) as total_volume,
  AVG(w.post_workout_energy_level) as avg_energy
FROM fitness_workouts w
WHERE w.started_at >= DATE_TRUNC('month', NOW())
  AND w.is_completed = TRUE
GROUP BY DATE(w.started_at)
ORDER BY workout_date DESC;
```

### 2. Exercise Volume Progression
```sql
-- Track volume progression for an exercise over time
SELECT
  DATE(w.started_at) as workout_date,
  MAX(s.weight_kg) as max_weight,
  SUM(s.reps) as total_reps,
  SUM(s.weight_kg * s.reps) as total_volume,
  MAX(calculate_one_rep_max(s.weight_kg, s.reps)) as estimated_1rm
FROM fitness_sets s
JOIN fitness_workout_exercises we ON s.workout_exercise_id = we.id
JOIN fitness_workouts w ON we.workout_id = w.id
JOIN fitness_exercises e ON we.exercise_id = e.id
WHERE e.name = 'Barbell Bench Press'
  AND s.set_type != 'Warmup'
  AND w.is_completed = TRUE
  AND w.started_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(w.started_at)
ORDER BY workout_date;
```

### 3. Muscle Group Training Frequency
```sql
-- Analyze which muscle groups are trained most
SELECT
  mg.name as muscle_group,
  COUNT(DISTINCT DATE(w.started_at)) as days_trained,
  COUNT(s.id) as total_sets,
  SUM(s.reps) as total_reps,
  SUM(s.weight_kg * s.reps) as total_volume
FROM fitness_muscle_groups mg
JOIN fitness_exercise_muscle_groups emg ON mg.id = emg.muscle_group_id
JOIN fitness_workout_exercises we ON emg.exercise_id = we.exercise_id
JOIN fitness_workouts w ON we.workout_id = w.id
JOIN fitness_sets s ON we.id = s.workout_exercise_id
WHERE w.started_at >= NOW() - INTERVAL '30 days'
  AND w.is_completed = TRUE
  AND emg.is_primary = TRUE
GROUP BY mg.name
ORDER BY total_volume DESC;
```

### 4. Personal Records Tracking
```sql
-- Find recent PRs across all exercises
WITH ranked_sets AS (
  SELECT
    e.name as exercise_name,
    s.weight_kg,
    s.reps,
    calculate_one_rep_max(s.weight_kg, s.reps) as estimated_1rm,
    w.started_at,
    ROW_NUMBER() OVER (
      PARTITION BY e.id
      ORDER BY calculate_one_rep_max(s.weight_kg, s.reps) DESC
    ) as rn
  FROM fitness_sets s
  JOIN fitness_workout_exercises we ON s.workout_exercise_id = we.id
  JOIN fitness_exercises e ON we.exercise_id = e.id
  JOIN fitness_workouts w ON we.workout_id = w.id
  WHERE s.set_type != 'Warmup'
    AND w.is_completed = TRUE
    AND s.weight_kg IS NOT NULL
    AND s.reps IS NOT NULL
)
SELECT
  exercise_name,
  weight_kg,
  reps,
  estimated_1rm,
  started_at as achieved_at
FROM ranked_sets
WHERE rn = 1
ORDER BY started_at DESC
LIMIT 20;
```

### 5. Body Composition Trends
```sql
-- Track weight and body fat changes
SELECT
  measured_at,
  weight_kg,
  body_fat_percentage,
  weight_kg * (1 - body_fat_percentage / 100) as lean_mass_kg,
  weight_kg * (body_fat_percentage / 100) as fat_mass_kg,
  LAG(weight_kg) OVER (ORDER BY measured_at) as previous_weight,
  weight_kg - LAG(weight_kg) OVER (ORDER BY measured_at) as weight_change
FROM fitness_body_measurements
ORDER BY measured_at DESC;
```

### 6. Template Popularity
```sql
-- Most used workout templates
SELECT
  t.id,
  t.name,
  t.usage_count,
  t.last_used_at,
  COUNT(DISTINCT w.id) as workout_instances,
  AVG(w.duration_minutes) as avg_duration,
  f.name as folder_name
FROM fitness_workout_templates t
LEFT JOIN fitness_workouts w ON t.id = w.template_id
LEFT JOIN fitness_folders f ON t.folder_id = f.id
WHERE t.is_active = TRUE
GROUP BY t.id, t.name, t.usage_count, t.last_used_at, f.name
ORDER BY t.usage_count DESC
LIMIT 10;
```

### 7. Workout Intensity Analysis
```sql
-- Analyze workout intensity via RPE
SELECT
  DATE_TRUNC('week', w.started_at) as week,
  COUNT(DISTINCT w.id) as workouts,
  AVG(s.rpe) as avg_rpe,
  MAX(s.rpe) as max_rpe,
  COUNT(s.id) FILTER (WHERE s.rpe >= 8) as hard_sets,
  COUNT(s.id) as total_sets
FROM fitness_workouts w
JOIN fitness_workout_exercises we ON w.id = we.workout_id
JOIN fitness_sets s ON we.id = s.workout_exercise_id
WHERE w.started_at >= NOW() - INTERVAL '12 weeks'
  AND w.is_completed = TRUE
  AND s.set_type = 'Normal'
GROUP BY DATE_TRUNC('week', w.started_at)
ORDER BY week DESC;
```

---

## Performance Optimization Strategies

### 1. Materialized Views for Analytics

Create materialized views for expensive aggregate queries:

```sql
-- Create materialized view for exercise statistics
CREATE MATERIALIZED VIEW fitness_exercise_stats AS
SELECT
  e.id as exercise_id,
  e.name as exercise_name,
  COUNT(DISTINCT we.workout_id) as times_performed,
  COUNT(s.id) as total_sets,
  SUM(s.reps) as total_reps,
  AVG(s.rpe) as avg_rpe,
  MAX(calculate_one_rep_max(s.weight_kg, s.reps)) as best_estimated_1rm,
  MAX(w.started_at) as last_performed
FROM fitness_exercises e
LEFT JOIN fitness_workout_exercises we ON e.id = we.exercise_id
LEFT JOIN fitness_sets s ON we.id = s.workout_exercise_id
LEFT JOIN fitness_workouts w ON we.workout_id = w.id
WHERE w.is_completed = TRUE
GROUP BY e.id, e.name;

-- Refresh periodically (e.g., nightly)
REFRESH MATERIALIZED VIEW fitness_exercise_stats;
```

### 2. Partitioning for Large Datasets

If you expect millions of workouts/sets:

```sql
-- Partition workouts by month
CREATE TABLE fitness_workouts_partitioned (
  LIKE fitness_workouts INCLUDING ALL
) PARTITION BY RANGE (started_at);

-- Create monthly partitions
CREATE TABLE fitness_workouts_2025_01 PARTITION OF fitness_workouts_partitioned
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE fitness_workouts_2025_02 PARTITION OF fitness_workouts_partitioned
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
-- etc.
```

### 3. Connection Pooling

Use PgBouncer or pg-pool for connection management:

```typescript
// Database connection pool configuration
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  max: 20,                    // Maximum pool size
  idleTimeoutMillis: 30000,   // Close idle connections
  connectionTimeoutMillis: 2000,
});
```

### 4. Query Optimization Checklist

- [ ] Use indexes for all foreign keys
- [ ] Add indexes for common WHERE clauses
- [ ] Use partial indexes for filtered queries
- [ ] Avoid SELECT * (specify needed columns)
- [ ] Use EXPLAIN ANALYZE to verify query plans
- [ ] Batch INSERT operations when possible
- [ ] Use CTEs for complex queries
- [ ] Leverage triggers for auto-calculations
- [ ] Cache frequently accessed data (Redis)
- [ ] Use read replicas for analytics queries

---

## Next Steps

1. **Run Migration:**
   ```bash
   psql $DATABASE_URL -f db/migrations/031_create_fitness_schema.sql
   psql $DATABASE_URL -f db/seeds/fitness_seed_data.sql
   ```

2. **Create API Endpoints:**
   - Implement REST API routes
   - Add input validation (Zod/Yup)
   - Implement authentication middleware
   - Add rate limiting

3. **Build Frontend:**
   - Exercise library with search/filters
   - Workout tracker interface
   - Progress charts and visualizations
   - Template builder

4. **Mobile Integration:**
   - Wear OS app for workout tracking
   - Health Connect sync service
   - Real-time set logging
   - Voice commands for hands-free logging

5. **Analytics & Reporting:**
   - Weekly/monthly progress reports
   - Muscle group balance analysis
   - Volume load tracking
   - Personal record notifications

---

## Additional Resources

- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Database Indexing Best Practices](https://use-the-index-luke.com/)
- [Health Connect Developer Guide](https://developer.android.com/health-and-fitness/guides/health-connect)
- [Wear OS Fitness Integration](https://developer.android.com/training/wearables/health-services)

---

## Support

For questions or issues with the fitness schema:
- Review this documentation
- Check query examples section
- Examine helper functions for common operations
- Use EXPLAIN ANALYZE for slow queries
