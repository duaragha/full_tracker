# Fitness Schema - Visual Diagram

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          EXERCISE MANAGEMENT                            │
└─────────────────────────────────────────────────────────────────────────┘

┌────────────────────────┐         ┌────────────────────────┐
│ fitness_exercise_      │         │ fitness_muscle_groups  │
│ categories             │         │                        │
├────────────────────────┤         ├────────────────────────┤
│ PK id                  │         │ PK id                  │
│    name                │         │    name                │
│    description         │         │    description         │
│    icon                │         │    anatomical_region   │
│    display_order       │         │    display_order       │
└────────┬───────────────┘         └────────┬───────────────┘
         │                                  │
         │                                  │
         │    ┌─────────────────────────────┴──────────────┐
         │    │                                            │
         │    │                                            ▼
         │    │                        ┌─────────────────────────────┐
         │    │                        │ fitness_exercise_muscle_    │
         │    │                        │ groups                      │
         │    │                        ├─────────────────────────────┤
         │    │                        │ PK id                       │
         │    │                   ┌────│ FK exercise_id              │
         │    │                   │    │ FK muscle_group_id          │
         │    │                   │    │    is_primary               │
         │    │                   │    │    involvement_level        │
         │    │                   │    └─────────────────────────────┘
         │    │                   │
         ▼    ▼                   │
┌──────────────────────────┐      │    ┌────────────────────────┐
│ fitness_exercises        │◄─────┘    │ fitness_equipment_     │
│                          │           │ types                  │
├──────────────────────────┤           ├────────────────────────┤
│ PK id                    │           │ PK id                  │
│ FK category_id           │───────────┤    name                │
│ FK primary_equipment_id  │◄──────────│    description         │
│    name                  │           │    icon                │
│    description           │           │    display_order       │
│    instructions          │           └────────────────────────┘
│    difficulty_level      │
│    force_type            │
│    mechanics_type        │
│    video_url             │
│    is_custom             │
│    popularity_score      │
└──────────┬───────────────┘
           │
           │
┌──────────────────────────────────────────────────────────────────────────┐
│                        WORKOUT ORGANIZATION                              │
└──────────────────────────────────────────────────────────────────────────┘
           │
           │    ┌────────────────────────┐
           │    │ fitness_folders        │
           │    ├────────────────────────┤
           │    │ PK id                  │
           │    │ FK parent_folder_id    │─┐ (self-reference)
           │    │    name                │◄┘
           │    │    description         │
           │    │    display_order       │
           │    └────────┬───────────────┘
           │             │
           │             ▼
           │    ┌────────────────────────────┐
           │    │ fitness_workout_templates  │
           │    ├────────────────────────────┤
           │    │ PK id                      │
           │    │ FK folder_id               │
           │    │    name                    │
           │    │    description             │
           │    │    difficulty_level        │
           │    │    primary_goal            │
           │    │    estimated_duration      │
           │    │    is_favorite             │
           │    │    last_used_at            │
           │    │    usage_count             │
           │    └────────┬───────────────────┘
           │             │
           │             ▼
           │    ┌────────────────────────────┐
           │    │ fitness_template_exercises │
           │    ├────────────────────────────┤
           │    │ PK id                      │
           │    │ FK template_id             │
           ├────┤ FK exercise_id             │
           │    │    exercise_order          │
           │    │    superset_group          │
           │    │    target_sets             │
           │    │    target_reps_min/max     │
           │    │    target_weight           │
           │    │    rest_between_sets       │
           │    └────────────────────────────┘
           │
           │
┌──────────────────────────────────────────────────────────────────────────┐
│                         WORKOUT TRACKING                                 │
└──────────────────────────────────────────────────────────────────────────┘
           │
           │    ┌────────────────────────────┐
           │    │ fitness_workouts           │
           │    ├────────────────────────────┤
           │    │ PK id                      │
           │    │ FK template_id (optional)  │───┐ (links to template)
           │    │    name                    │   │
           │    │    started_at              │   │
           │    │    ended_at                │   │
           │    │    duration_minutes        │◄──┘ (auto-calculated)
           │    │    bodyweight_kg           │
           │    │    pre/post_energy_level   │
           │    │    overall_feeling         │
           │    │    location                │
           │    │    total_volume_kg         │
           │    │    total_sets/reps         │
           │    │    is_completed            │
           │    │    health_connect_id       │ (Wear OS integration)
           │    └────────┬───────────────────┘
           │             │
           │             ▼
           │    ┌────────────────────────────┐
           │    │ fitness_workout_exercises  │
           │    ├────────────────────────────┤
           │    │ PK id                      │
           │    │ FK workout_id              │
           ├────┤ FK exercise_id             │
           │    │    exercise_order          │
           │    │    superset_group          │
           │    │    notes                   │
           │    └────────┬───────────────────┘
           │             │
           │             ▼
           │    ┌────────────────────────────┐
           │    │ fitness_sets               │
           │    ├────────────────────────────┤
           │    │ PK id                      │
           │    │ FK workout_exercise_id     │
           │    │    set_number              │
           │    │    set_type                │ (Normal/Warmup/Drop/Failure/AMRAP)
           │    │    reps                    │
           │    │    weight_kg               │
           │    │    duration_seconds        │ (for timed exercises)
           │    │    distance_meters         │ (for cardio)
           │    │    rpe                     │ (1-10 scale)
           │    │    rest_seconds            │
           │    │    is_personal_record      │
           │    │    is_failed               │
           │    │    completed_at            │
           │    └────────────────────────────┘
           │
           │
┌──────────────────────────────────────────────────────────────────────────┐
│                        PROGRESS TRACKING                                 │
└──────────────────────────────────────────────────────────────────────────┘
           │
           │    ┌────────────────────────────┐
           │    │ fitness_personal_records   │
           │    ├────────────────────────────┤
           │    │ PK id                      │
           ├────┤ FK exercise_id             │
           │    │ FK workout_id (optional)   │───┐
           │    │ FK set_id (optional)       │   │ (links to source)
           │    │    record_type             │◄──┘
           │    │    weight_kg               │
           │    │    reps                    │
           │    │    duration_seconds        │
           │    │    distance_meters         │
           │    │    volume_kg               │
           │    │    achieved_at             │
           │    └────────────────────────────┘
           │
           │
           │    ┌────────────────────────────┐
           │    │ fitness_body_measurements  │
           │    ├────────────────────────────┤
           │    │ PK id                      │
           │    │    measured_at             │
           │    │    weight_kg               │
           │    │    body_fat_percentage     │
           │    │    muscle_mass_kg          │
           │    │    neck_cm                 │
           │    │    chest_cm                │
           │    │    waist_cm                │
           │    │    hips_cm                 │
           │    │    left_bicep_cm           │
           │    │    right_bicep_cm          │
           │    │    left_thigh_cm           │
           │    │    right_thigh_cm          │
           │    │    left_calf_cm            │
           │    │    right_calf_cm           │
           │    │    bmi                     │
           │    │    health_connect_id       │
           │    └────────┬───────────────────┘
           │             │
           │             ▼
           │    ┌────────────────────────────┐
           │    │ fitness_progress_photos    │
           │    ├────────────────────────────┤
           │    │ PK id                      │
           │    │ FK measurement_id          │
           │    │    photo_url               │
           │    │    photo_type              │ (Front/Back/Side)
           │    │    taken_at                │
           │    │    weight_kg               │
           │    │    tags                    │ (JSONB array)
           │    │    is_private              │
           │    └────────────────────────────┘
           │
           │
┌──────────────────────────────────────────────────────────────────────────┐
│                    WEAR OS / HEALTH CONNECT                              │
└──────────────────────────────────────────────────────────────────────────┘
           │
           │    ┌────────────────────────────┐
           │    │ fitness_health_connect_    │
           └────│ sync                       │
                ├────────────────────────────┤
                │ PK id                      │
                │ FK mapped_workout_id       │───┐
                │ FK mapped_measurement_id   │   │ (links after processing)
                │    sync_type               │◄──┘
                │    health_connect_id       │
                │    raw_data                │ (JSONB - flexible)
                │    is_processed            │
                │    processed_at            │
                │    health_connect_timestamp│
                │    synced_at               │
                └────────────────────────────┘
```

## Table Statistics

| Table Name | Purpose | Typical Size | Relationships |
|------------|---------|--------------|---------------|
| fitness_exercise_categories | Exercise categorization | ~10 rows | 1:N with exercises |
| fitness_muscle_groups | Muscle group definitions | ~17 rows | N:M with exercises |
| fitness_equipment_types | Equipment definitions | ~16 rows | 1:N with exercises |
| fitness_exercises | Exercise database | 100s-1000s | N:M muscles, 1:N usage |
| fitness_exercise_muscle_groups | Exercise-muscle mapping | 100s-1000s | N:M junction |
| fitness_folders | Template organization | 10s-100s | Self-referencing hierarchy |
| fitness_workout_templates | Workout programs | 10s-100s | 1:N exercises |
| fitness_template_exercises | Template details | 100s-1000s | N:1 template, N:1 exercise |
| fitness_workouts | Workout sessions | 1000s-millions | 1:N exercises, 1:1 template |
| fitness_workout_exercises | Exercises in workouts | 1000s-millions | 1:N sets |
| fitness_sets | Individual sets | millions+ | N:1 workout exercise |
| fitness_personal_records | PRs by exercise | 100s-1000s | N:1 exercise |
| fitness_body_measurements | Body metrics | 100s-1000s | 1:N photos |
| fitness_progress_photos | Progress photos | 100s-1000s | N:1 measurement |
| fitness_health_connect_sync | Wear OS sync data | 1000s-millions | 1:1 workout/measurement |

## Key Indexes

### High-Traffic Queries
```
1. Exercise Search
   - idx_fitness_exercises_search (GIN full-text)
   - idx_fitness_exercises_category
   - idx_fitness_exercises_equipment
   - idx_fitness_exercises_popularity

2. Workout Queries
   - idx_fitness_workouts_started_at (DESC)
   - idx_fitness_workouts_date
   - idx_fitness_workouts_completed

3. Set Retrieval
   - idx_fitness_sets_workout_exercise
   - idx_fitness_sets_completed_at
   - idx_fitness_sets_pr

4. Template Access
   - idx_fitness_workout_templates_favorite
   - idx_fitness_workout_templates_last_used
```

## Cascade Behavior

### DELETE CASCADE
```
Workout deleted → Deletes all workout_exercises → Deletes all sets
Template deleted → Deletes all template_exercises
Folder deleted → Deletes all child folders and templates
```

### SET NULL
```
Category deleted → Sets category_id to NULL in exercises
Equipment deleted → Sets equipment_id to NULL in exercises
Template deleted → Sets template_id to NULL in workouts (keeps workout)
```

## Helper Functions

```sql
-- One Rep Max Calculation
calculate_one_rep_max(weight DECIMAL, reps INTEGER) → DECIMAL

-- Exercise Performance History
get_exercise_history(exercise_id INTEGER, limit INTEGER) → TABLE

-- Workout Statistics
get_workout_stats(workout_id INTEGER) → TABLE

-- Personal Best Lookup
get_personal_best(exercise_id INTEGER, record_type TEXT) → TABLE
```

## Triggers

### Automatic Updates
```
1. update_fitness_updated_at()
   - Updates updated_at on all tables with that column

2. calculate_workout_duration()
   - Auto-calculates duration_minutes from timestamps

3. increment_exercise_popularity()
   - Increments popularity_score when exercise used

4. update_template_last_used()
   - Updates last_used_at and usage_count when template used
```

## Data Flow Examples

### Creating a Workout from Template
```
1. User selects template (fitness_workout_templates)
2. System creates workout record (fitness_workouts)
   - template_id linked
   - last_used_at updated via trigger
3. System copies exercises (fitness_template_exercises → fitness_workout_exercises)
4. User logs sets (fitness_sets)
   - popularity_score incremented via trigger
5. System checks for PRs (fitness_personal_records)
6. Workout completed (is_completed = TRUE)
```

### Exercise Search Flow
```
1. User searches "bench press"
2. Query uses:
   - idx_fitness_exercises_search (full-text)
   - Join to fitness_exercise_categories
   - Join to fitness_equipment_types
   - Join to fitness_muscle_groups (via junction table)
3. Results ordered by popularity_score
4. Returns: exercise + category + equipment + muscles
```

### PR Detection Flow
```
1. User completes set with weight + reps
2. System calculates 1RM using calculate_one_rep_max()
3. Query current PR using get_personal_best()
4. If new > old:
   - Set is_personal_record = TRUE
   - Insert into fitness_personal_records
   - Return notification to user
```

## Future Enhancements

### Planned Features
```
1. User Authentication
   - Add user_id to workouts, exercises, measurements
   - Row-level security

2. Social Features
   - Share custom exercises (is_public flag)
   - Follow other users
   - Workout challenges

3. Advanced Analytics
   - Materialized views for dashboards
   - Time-series analysis
   - Muscle fatigue tracking

4. AI/ML Integration
   - Workout recommendations
   - Automatic exercise detection (Wear OS)
   - Form analysis via video

5. Third-party Integrations
   - Strava sync
   - Apple Health
   - Google Fit
   - MyFitnessPal
```

## Performance Targets

| Metric | Target | Optimization |
|--------|--------|--------------|
| Exercise search | < 10ms | Full-text index |
| Workout list | < 20ms | Date index + pagination |
| Set logging | < 50ms | Batch inserts |
| PR calculation | < 50ms | Indexed lookups |
| Dashboard load | < 200ms | Materialized views |
| Sync operation | < 500ms | Background jobs |

## Schema Version

- **Version:** 1.0.0
- **Migration:** 031_create_fitness_schema.sql
- **Created:** 2025-11-14
- **Tables:** 15
- **Indexes:** 20+
- **Functions:** 4
- **Triggers:** 4

---

This schema is designed to be:
- **Scalable** - Handles millions of records
- **Performant** - Sub-100ms queries
- **Flexible** - JSONB for extensibility
- **Future-proof** - Wear OS ready
- **Comprehensive** - All fitness tracking needs
