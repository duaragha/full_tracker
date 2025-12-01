# Fitness Tracking - Quick Start Guide

## Installation (5 minutes)

### 1. Run Migration

```bash
# Using the migration script
npm run tsx scripts/run-fitness-migration.ts

# OR manually with psql
psql $POSTGRES_URL -f db/migrations/031_create_fitness_schema.sql
psql $POSTGRES_URL -f db/seeds/fitness_seed_data.sql
```

### 2. Verify Installation

```sql
-- Check tables created
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'fitness_%';
-- Should return 15

-- Check exercises loaded
SELECT COUNT(*) FROM fitness_exercises;
-- Should return 40+
```

### 3. Add to package.json

```json
{
  "scripts": {
    "fitness:migrate": "tsx scripts/run-fitness-migration.ts",
    "fitness:test": "tsx scripts/test-fitness-api.ts"
  }
}
```

---

## Database Schema Overview

### 15 Tables Created

**Exercise Database (5 tables)**
- `fitness_exercise_categories` - Strength, Cardio, Core, etc.
- `fitness_muscle_groups` - Chest, Back, Legs, etc.
- `fitness_equipment_types` - Barbell, Dumbbell, Bodyweight, etc.
- `fitness_exercises` - 40+ pre-loaded exercises
- `fitness_exercise_muscle_groups` - Exercise-to-muscle mapping

**Workout Tracking (5 tables)**
- `fitness_workout_templates` - Reusable workout programs
- `fitness_template_exercises` - Exercises in templates
- `fitness_workouts` - Actual workout sessions
- `fitness_workout_exercises` - Exercises in workouts
- `fitness_sets` - Individual sets (reps, weight, RPE)

**Organization & Progress (5 tables)**
- `fitness_folders` - Organize templates into folders
- `fitness_personal_records` - Track PRs
- `fitness_body_measurements` - Weight, body fat, circumferences
- `fitness_progress_photos` - Progress photos with metadata
- `fitness_health_connect_sync` - Wear OS/Health Connect integration

---

## Quick API Examples

### Get All Exercises

```typescript
const response = await fetch('/api/fitness/exercises?category=Strength');
const { exercises } = await response.json();
```

### Start a Workout

```typescript
const workout = await fetch('/api/fitness/workouts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Upper Body Push',
    started_at: new Date().toISOString(),
    bodyweight_kg: 80.5,
    pre_workout_energy_level: 7
  })
}).then(r => r.json());
```

### Add Exercise to Workout

```typescript
const workoutExercise = await fetch(`/api/fitness/workouts/${workoutId}/exercises`, {
  method: 'POST',
  body: JSON.stringify({
    exercise_id: 1, // Bench Press
    exercise_order: 1
  })
}).then(r => r.json());
```

### Log a Set

```typescript
const set = await fetch(`/api/fitness/workouts/${workoutId}/sets`, {
  method: 'POST',
  body: JSON.stringify({
    workout_exercise_id: workoutExercise.id,
    set_number: 1,
    reps: 10,
    weight_kg: 100,
    rpe: 7
  })
}).then(r => r.json());
```

### Complete Workout

```typescript
await fetch(`/api/fitness/workouts/${workoutId}`, {
  method: 'PUT',
  body: JSON.stringify({
    ended_at: new Date().toISOString(),
    is_completed: true,
    post_workout_energy_level: 8
  })
});
```

---

## Useful SQL Queries

### Get Exercise with Muscle Groups

```sql
SELECT
  e.name,
  e.difficulty_level,
  json_agg(mg.name) as muscle_groups
FROM fitness_exercises e
JOIN fitness_exercise_muscle_groups emg ON e.id = emg.exercise_id
JOIN fitness_muscle_groups mg ON emg.muscle_group_id = mg.id
WHERE e.name = 'Barbell Bench Press'
GROUP BY e.id, e.name, e.difficulty_level;
```

### Get Recent Workouts with Stats

```sql
SELECT
  w.id,
  w.name,
  w.started_at,
  w.duration_minutes,
  COUNT(DISTINCT we.exercise_id) as exercises,
  COUNT(s.id) as total_sets,
  SUM(s.weight_kg * s.reps) as volume_kg
FROM fitness_workouts w
LEFT JOIN fitness_workout_exercises we ON w.id = we.workout_id
LEFT JOIN fitness_sets s ON we.id = s.workout_exercise_id
WHERE w.is_completed = TRUE
GROUP BY w.id
ORDER BY w.started_at DESC
LIMIT 10;
```

### Get Personal Best for Exercise

```sql
SELECT * FROM get_personal_best(
  (SELECT id FROM fitness_exercises WHERE name = 'Barbell Squat'),
  'One Rep Max'
);
```

### Calculate 1RM

```sql
SELECT calculate_one_rep_max(100, 8) as estimated_1rm;
-- Returns ~125kg
```

---

## Key Features

### Supported Set Types
- **Normal** - Standard working set
- **Warmup** - Warmup set (excluded from volume calculations)
- **Drop** - Drop set
- **Failure** - Set taken to failure
- **AMRAP** - As Many Reps As Possible

### Superset Support
Group exercises together using `superset_group` field:
```typescript
// Exercise 1 in superset A
{ exercise_id: 1, superset_group: 'A' }

// Exercise 2 in superset A
{ exercise_id: 2, superset_group: 'A' }

// Regular exercise (no superset)
{ exercise_id: 3, superset_group: null }
```

### RPE Tracking
Rate of Perceived Exertion (1-10 scale):
- **1-3**: Very light
- **4-6**: Moderate
- **7-8**: Hard (2-3 reps in reserve)
- **9**: Very hard (1 rep in reserve)
- **10**: Maximum effort / failure

### Automatic Calculations
- Workout duration (ended_at - started_at)
- Total volume (sum of weight × reps)
- 1RM estimation (Brzycki/Epley formula)
- Personal record detection
- Exercise popularity tracking
- Template usage tracking

---

## Database Indexes

All critical indexes are pre-created:
- Exercise name search (full-text)
- Workout date filtering
- Set retrieval by workout
- Personal records by exercise
- Template favorites and recent

**Expected query performance:**
- Exercise search: < 10ms
- Workout list: < 20ms
- Set history: < 30ms

---

## Helper Functions

### calculate_one_rep_max(weight, reps)
Estimates 1RM from weight and reps.

### get_exercise_history(exercise_id, limit)
Returns recent performance for an exercise.

### get_workout_stats(workout_id)
Aggregates workout statistics.

### get_personal_best(exercise_id, record_type)
Gets current PR for an exercise.

---

## Sample Workout Flow

```typescript
// 1. Start workout
const workout = await createWorkout({
  name: 'Push Day',
  bodyweight_kg: 80,
  pre_workout_energy_level: 7
});

// 2. Add exercises
const benchPress = await addExerciseToWorkout(workout.id, {
  exercise_id: 1, // Barbell Bench Press
  exercise_order: 1
});

// 3. Log sets
await logSet(workout.id, {
  workout_exercise_id: benchPress.id,
  set_number: 1,
  set_type: 'Warmup',
  reps: 10,
  weight_kg: 60,
  rpe: 4
});

await logSet(workout.id, {
  workout_exercise_id: benchPress.id,
  set_number: 2,
  reps: 8,
  weight_kg: 100,
  rpe: 7
});

// 4. Complete workout
await completeWorkout(workout.id, {
  post_workout_energy_level: 8,
  overall_feeling: 'Good'
});
```

---

## Data Model Relationships

```
Workout
  ├─ WorkoutExercise (many)
  │   ├─ Exercise (one)
  │   └─ Set (many)
  └─ Template (optional one)

Template
  ├─ TemplateExercise (many)
  │   └─ Exercise (one)
  └─ Folder (optional one)

Exercise
  ├─ Category (one)
  ├─ Equipment (one)
  └─ MuscleGroup (many)
```

---

## Integration with Existing App

### Shared User Context (Future)
When you add authentication:
```sql
ALTER TABLE fitness_workouts ADD COLUMN user_id INTEGER REFERENCES users(id);
CREATE INDEX idx_fitness_workouts_user ON fitness_workouts(user_id, started_at DESC);
```

### Link to Calendar
```sql
ALTER TABLE fitness_workouts ADD COLUMN calendar_event_id INTEGER;
```

### Export Data
```typescript
// Export workout to CSV
const workoutData = await getWorkoutWithSets(workoutId);
const csv = convertToCSV(workoutData);
downloadFile('workout.csv', csv);
```

---

## Next Steps

### 1. Create API Routes
See `db/docs/FITNESS_INTEGRATION_GUIDE.md` for full API implementation examples.

### 2. Build UI Components
- Exercise library browser
- Workout tracker (active workout)
- Progress charts
- Template builder

### 3. Mobile App
- Wear OS workout tracker
- Health Connect sync
- Quick set logging
- Voice commands

### 4. Analytics
- Volume trends
- Muscle group distribution
- Workout frequency
- Progress photos timeline

---

## Documentation

**Full Documentation:**
- `db/docs/FITNESS_SCHEMA_DOCUMENTATION.md` - Complete schema reference
- `db/docs/FITNESS_INTEGRATION_GUIDE.md` - API implementation guide

**Files Created:**
- `db/migrations/031_create_fitness_schema.sql` - Schema migration
- `db/seeds/fitness_seed_data.sql` - Initial exercise data
- `scripts/run-fitness-migration.ts` - Migration runner script

---

## Troubleshooting

### Migration Fails
```bash
# Check database connection
psql $POSTGRES_URL -c "SELECT version();"

# Check if tables already exist
psql $POSTGRES_URL -c "SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'fitness_%';"

# Drop all fitness tables if needed (WARNING: destroys data)
psql $POSTGRES_URL -c "DROP SCHEMA IF EXISTS fitness CASCADE;"
```

### API Returns 500
- Check database connection string in `.env.local`
- Verify migration ran successfully
- Check server logs for SQL errors
- Ensure required fields are provided in requests

### Slow Queries
```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT ...;

-- Rebuild indexes if needed
REINDEX TABLE fitness_sets;

-- Update statistics
ANALYZE fitness_workouts;
```

---

## Support

Questions? Check:
1. Full documentation in `db/docs/`
2. SQL comments in migration file
3. Example queries in documentation
4. Helper functions for common operations

Happy tracking! 🏋️
