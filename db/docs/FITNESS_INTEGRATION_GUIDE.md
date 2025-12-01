# Fitness Schema Integration Guide

## Quick Start

This guide helps you integrate the fitness tracking schema into your existing full_tracker application.

## Prerequisites

- PostgreSQL database (already configured)
- Node.js 18+ with TypeScript
- Next.js 16 (already installed)
- Existing database connection in your app

## Installation Steps

### 1. Run Database Migrations

```bash
# Navigate to project directory
cd C:\Users\ragha\Projects\full_tracker

# Run the fitness schema migration
psql $DATABASE_URL -f db/migrations/031_create_fitness_schema.sql

# Seed with exercise data
psql $DATABASE_URL -f db/seeds/fitness_seed_data.sql
```

**Alternative: Use existing migration system**

If you have a migration runner:

```bash
node db/migrate.js
```

### 2. Verify Installation

```sql
-- Check tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'fitness_%'
ORDER BY table_name;

-- Should return 15 tables:
-- fitness_body_measurements
-- fitness_exercise_categories
-- fitness_exercise_muscle_groups
-- fitness_equipment_types
-- fitness_exercises
-- fitness_folders
-- fitness_health_connect_sync
-- fitness_personal_records
-- fitness_progress_photos
-- fitness_sets
-- fitness_template_exercises
-- fitness_workout_exercises
-- fitness_workout_templates
-- fitness_workouts
-- fitness_muscle_groups

-- Check seed data
SELECT COUNT(*) as exercise_count FROM fitness_exercises;
-- Should have ~50+ exercises

SELECT COUNT(*) as category_count FROM fitness_exercise_categories;
-- Should have 7 categories

SELECT COUNT(*) as muscle_group_count FROM fitness_muscle_groups;
-- Should have 17 muscle groups
```

---

## Database Connection

### Option 1: Use Existing Vercel Postgres Connection

Your app already uses `@vercel/postgres`. Extend it:

```typescript
// lib/db/fitness.ts
import { sql } from '@vercel/postgres';

export async function getExercises(filters?: {
  category?: string;
  equipment?: string;
  muscleGroup?: string;
  search?: string;
}) {
  let query = `
    SELECT e.*, ec.name as category_name, et.name as equipment_name
    FROM fitness_exercises e
    LEFT JOIN fitness_exercise_categories ec ON e.category_id = ec.id
    LEFT JOIN fitness_equipment_types et ON e.primary_equipment_id = et.id
    WHERE e.is_active = TRUE
  `;

  const params: any[] = [];
  let paramIndex = 1;

  if (filters?.category) {
    query += ` AND ec.name = $${paramIndex}`;
    params.push(filters.category);
    paramIndex++;
  }

  if (filters?.equipment) {
    query += ` AND et.name = $${paramIndex}`;
    params.push(filters.equipment);
    paramIndex++;
  }

  if (filters?.search) {
    query += ` AND (e.name ILIKE $${paramIndex} OR e.description ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  query += ` ORDER BY e.popularity_score DESC, e.name`;

  const result = await sql.query(query, params);
  return result.rows;
}
```

### Option 2: Use Direct PostgreSQL Connection

```typescript
// lib/db/pg-pool.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export default pool;
```

---

## API Routes Implementation

### Exercise Management

#### `app/api/fitness/exercises/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const equipment = searchParams.get('equipment');
    const muscleGroup = searchParams.get('muscle_group');
    const search = searchParams.get('search');
    const difficulty = searchParams.get('difficulty');

    let query = `
      SELECT
        e.id,
        e.name,
        e.description,
        e.difficulty_level,
        e.force_type,
        e.mechanics_type,
        e.video_url,
        e.thumbnail_url,
        ec.name as category,
        et.name as equipment,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'name', mg.name,
              'is_primary', emg.is_primary
            )
          ) FILTER (WHERE mg.id IS NOT NULL),
          '[]'
        ) as muscle_groups
      FROM fitness_exercises e
      LEFT JOIN fitness_exercise_categories ec ON e.category_id = ec.id
      LEFT JOIN fitness_equipment_types et ON e.primary_equipment_id = et.id
      LEFT JOIN fitness_exercise_muscle_groups emg ON e.id = emg.exercise_id
      LEFT JOIN fitness_muscle_groups mg ON emg.muscle_group_id = mg.id
      WHERE e.is_active = TRUE
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND ec.name = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (equipment) {
      query += ` AND et.name = $${paramIndex}`;
      params.push(equipment);
      paramIndex++;
    }

    if (muscleGroup) {
      query += ` AND e.id IN (
        SELECT exercise_id FROM fitness_exercise_muscle_groups
        JOIN fitness_muscle_groups ON muscle_group_id = fitness_muscle_groups.id
        WHERE fitness_muscle_groups.name = $${paramIndex}
      )`;
      params.push(muscleGroup);
      paramIndex++;
    }

    if (difficulty) {
      query += ` AND e.difficulty_level = $${paramIndex}`;
      params.push(difficulty);
      paramIndex++;
    }

    if (search) {
      query += ` AND (
        e.name ILIKE $${paramIndex}
        OR e.description ILIKE $${paramIndex}
        OR to_tsvector('english', e.name || ' ' || COALESCE(e.description, ''))
           @@ plainto_tsquery('english', $${paramIndex})
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += `
      GROUP BY e.id, ec.name, et.name
      ORDER BY e.popularity_score DESC, e.name
      LIMIT 100
    `;

    const result = await sql.query(query, params);

    return NextResponse.json({
      exercises: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching exercises:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exercises' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      instructions,
      category_id,
      primary_equipment_id,
      difficulty_level,
      force_type,
      mechanics_type,
      muscle_group_ids,
    } = body;

    // Validation
    if (!name || !category_id) {
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      );
    }

    // Insert exercise
    const result = await sql.query(`
      INSERT INTO fitness_exercises (
        name, description, instructions, category_id,
        primary_equipment_id, difficulty_level, force_type,
        mechanics_type, is_custom
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
      RETURNING *
    `, [
      name, description, instructions, category_id,
      primary_equipment_id, difficulty_level, force_type,
      mechanics_type
    ]);

    const exercise = result.rows[0];

    // Add muscle group mappings
    if (muscle_group_ids && muscle_group_ids.length > 0) {
      for (const muscleGroupId of muscle_group_ids) {
        await sql.query(`
          INSERT INTO fitness_exercise_muscle_groups (
            exercise_id, muscle_group_id, is_primary
          ) VALUES ($1, $2, TRUE)
        `, [exercise.id, muscleGroupId]);
      }
    }

    return NextResponse.json(exercise, { status: 201 });
  } catch (error) {
    console.error('Error creating exercise:', error);
    return NextResponse.json(
      { error: 'Failed to create exercise' },
      { status: 500 }
    );
  }
}
```

#### `app/api/fitness/exercises/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const exerciseId = parseInt(params.id);

    const result = await sql.query(`
      SELECT
        e.*,
        ec.name as category,
        et.name as equipment,
        json_agg(
          DISTINCT jsonb_build_object(
            'id', mg.id,
            'name', mg.name,
            'is_primary', emg.is_primary,
            'involvement_level', emg.involvement_level
          )
        ) FILTER (WHERE mg.id IS NOT NULL) as muscle_groups
      FROM fitness_exercises e
      LEFT JOIN fitness_exercise_categories ec ON e.category_id = ec.id
      LEFT JOIN fitness_equipment_types et ON e.primary_equipment_id = et.id
      LEFT JOIN fitness_exercise_muscle_groups emg ON e.id = emg.exercise_id
      LEFT JOIN fitness_muscle_groups mg ON emg.muscle_group_id = mg.id
      WHERE e.id = $1
      GROUP BY e.id, ec.name, et.name
    `, [exerciseId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Exercise not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching exercise:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exercise' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const exerciseId = parseInt(params.id);
    const body = await request.json();

    const result = await sql.query(`
      UPDATE fitness_exercises
      SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        instructions = COALESCE($3, instructions),
        difficulty_level = COALESCE($4, difficulty_level),
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [
      body.name,
      body.description,
      body.instructions,
      body.difficulty_level,
      exerciseId
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Exercise not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating exercise:', error);
    return NextResponse.json(
      { error: 'Failed to update exercise' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const exerciseId = parseInt(params.id);

    // Check if it's a custom exercise
    const checkResult = await sql.query(
      'SELECT is_custom FROM fitness_exercises WHERE id = $1',
      [exerciseId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Exercise not found' },
        { status: 404 }
      );
    }

    if (!checkResult.rows[0].is_custom) {
      return NextResponse.json(
        { error: 'Cannot delete system exercises' },
        { status: 403 }
      );
    }

    await sql.query('DELETE FROM fitness_exercises WHERE id = $1', [exerciseId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting exercise:', error);
    return NextResponse.json(
      { error: 'Failed to delete exercise' },
      { status: 500 }
    );
  }
}
```

### Workout Tracking

#### `app/api/fitness/workouts/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const completed = searchParams.get('completed');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT
        w.*,
        COUNT(DISTINCT we.exercise_id) as exercise_count,
        COUNT(s.id) as total_sets,
        SUM(s.reps) as total_reps,
        SUM(s.weight_kg * s.reps) as total_volume_kg
      FROM fitness_workouts w
      LEFT JOIN fitness_workout_exercises we ON w.id = we.workout_id
      LEFT JOIN fitness_sets s ON we.id = s.workout_exercise_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (startDate) {
      query += ` AND w.started_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND w.started_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    if (completed !== null) {
      query += ` AND w.is_completed = $${paramIndex}`;
      params.push(completed === 'true');
      paramIndex++;
    }

    query += `
      GROUP BY w.id
      ORDER BY w.started_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await sql.query(query, params);

    return NextResponse.json({
      workouts: result.rows,
      count: result.rows.length,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching workouts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workouts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      template_id,
      started_at,
      bodyweight_kg,
      pre_workout_energy_level,
      location
    } = body;

    const result = await sql.query(`
      INSERT INTO fitness_workouts (
        name, template_id, started_at, bodyweight_kg,
        pre_workout_energy_level, location
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      name,
      template_id || null,
      started_at || new Date().toISOString(),
      bodyweight_kg,
      pre_workout_energy_level,
      location
    ]);

    const workout = result.rows[0];

    // If template_id provided, copy exercises from template
    if (template_id) {
      const templateExercises = await sql.query(`
        SELECT * FROM fitness_template_exercises
        WHERE template_id = $1
        ORDER BY exercise_order
      `, [template_id]);

      for (const te of templateExercises.rows) {
        await sql.query(`
          INSERT INTO fitness_workout_exercises (
            workout_id, exercise_id, exercise_order,
            superset_group, notes
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          workout.id,
          te.exercise_id,
          te.exercise_order,
          te.superset_group,
          te.notes
        ]);
      }
    }

    return NextResponse.json(workout, { status: 201 });
  } catch (error) {
    console.error('Error creating workout:', error);
    return NextResponse.json(
      { error: 'Failed to create workout' },
      { status: 500 }
    );
  }
}
```

#### `app/api/fitness/workouts/[id]/sets/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workoutId = parseInt(params.id);
    const body = await request.json();
    const {
      workout_exercise_id,
      set_number,
      set_type,
      reps,
      weight_kg,
      duration_seconds,
      distance_meters,
      rpe,
      notes
    } = body;

    // Validation
    if (!workout_exercise_id || !set_number) {
      return NextResponse.json(
        { error: 'workout_exercise_id and set_number are required' },
        { status: 400 }
      );
    }

    // Insert set
    const result = await sql.query(`
      INSERT INTO fitness_sets (
        workout_exercise_id, set_number, set_type,
        reps, weight_kg, duration_seconds, distance_meters,
        rpe, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      workout_exercise_id, set_number, set_type || 'Normal',
      reps, weight_kg, duration_seconds, distance_meters,
      rpe, notes
    ]);

    const set = result.rows[0];

    // Check if it's a personal record
    if (set_type === 'Normal' && weight_kg && reps) {
      const exerciseId = await sql.query(`
        SELECT exercise_id FROM fitness_workout_exercises
        WHERE id = $1
      `, [workout_exercise_id]);

      if (exerciseId.rows.length > 0) {
        const currentPR = await sql.query(`
          SELECT * FROM get_personal_best($1, 'One Rep Max')
        `, [exerciseId.rows[0].exercise_id]);

        const estimatedMax = await sql.query(
          'SELECT calculate_one_rep_max($1, $2) as max',
          [weight_kg, reps]
        );

        const newMax = estimatedMax.rows[0].max;
        const oldMax = currentPR.rows[0]?.record_value || 0;

        if (newMax > oldMax) {
          // Update set as PR
          await sql.query(
            'UPDATE fitness_sets SET is_personal_record = TRUE WHERE id = $1',
            [set.id]
          );

          // Create PR record
          await sql.query(`
            INSERT INTO fitness_personal_records (
              exercise_id, record_type, weight_kg, reps,
              workout_id, set_id, achieved_at
            ) VALUES ($1, 'One Rep Max', $2, $3, $4, $5, NOW())
          `, [
            exerciseId.rows[0].exercise_id,
            weight_kg,
            reps,
            workoutId,
            set.id
          ]);

          set.is_personal_record = true;
        }
      }
    }

    return NextResponse.json(set, { status: 201 });
  } catch (error) {
    console.error('Error adding set:', error);
    return NextResponse.json(
      { error: 'Failed to add set' },
      { status: 500 }
    );
  }
}
```

---

## TypeScript Type Definitions

Create type definitions for type safety:

#### `types/fitness.ts`

```typescript
export interface Exercise {
  id: number;
  name: string;
  description: string | null;
  instructions: string | null;
  category_id: number | null;
  category?: string;
  primary_equipment_id: number | null;
  equipment?: string;
  difficulty_level: 'Beginner' | 'Intermediate' | 'Advanced' | null;
  force_type: 'Push' | 'Pull' | 'Static' | null;
  mechanics_type: 'Compound' | 'Isolation' | null;
  video_url: string | null;
  thumbnail_url: string | null;
  is_custom: boolean;
  is_active: boolean;
  popularity_score: number;
  muscle_groups?: MuscleGroup[];
  created_at: string;
  updated_at: string;
}

export interface MuscleGroup {
  id: number;
  name: string;
  description: string | null;
  anatomical_region: string | null;
  is_primary?: boolean;
  involvement_level?: 'High' | 'Medium' | 'Low';
}

export interface Workout {
  id: number;
  name: string | null;
  template_id: number | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  location: string | null;
  bodyweight_kg: number | null;
  pre_workout_energy_level: number | null;
  post_workout_energy_level: number | null;
  overall_feeling: 'Great' | 'Good' | 'Average' | 'Poor' | 'Terrible' | null;
  notes: string | null;
  total_volume_kg: number | null;
  total_reps: number | null;
  total_sets: number | null;
  exercises_count: number | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkoutExercise {
  id: number;
  workout_id: number;
  exercise_id: number;
  exercise?: Exercise;
  exercise_order: number;
  superset_group: string | null;
  notes: string | null;
  sets?: WorkoutSet[];
}

export interface WorkoutSet {
  id: number;
  workout_exercise_id: number;
  set_number: number;
  set_type: 'Normal' | 'Warmup' | 'Drop' | 'Failure' | 'AMRAP';
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  rpe: number | null;
  rest_seconds: number | null;
  is_personal_record: boolean;
  is_failed: boolean;
  notes: string | null;
  completed_at: string;
}

export interface WorkoutTemplate {
  id: number;
  name: string;
  description: string | null;
  notes: string | null;
  folder_id: number | null;
  difficulty_level: 'Beginner' | 'Intermediate' | 'Advanced' | null;
  primary_goal: string | null;
  estimated_duration_minutes: number | null;
  is_active: boolean;
  is_favorite: boolean;
  last_used_at: string | null;
  usage_count: number;
  exercises?: TemplateExercise[];
}

export interface TemplateExercise {
  id: number;
  template_id: number;
  exercise_id: number;
  exercise?: Exercise;
  exercise_order: number;
  superset_group: string | null;
  target_sets: number | null;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_weight: number | null;
  rest_between_sets_seconds: number;
  notes: string | null;
}

export interface BodyMeasurement {
  id: number;
  measured_at: string;
  weight_kg: number | null;
  body_fat_percentage: number | null;
  muscle_mass_kg: number | null;
  neck_cm: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  left_bicep_cm: number | null;
  right_bicep_cm: number | null;
  left_thigh_cm: number | null;
  right_thigh_cm: number | null;
  left_calf_cm: number | null;
  right_calf_cm: number | null;
  bmi: number | null;
  notes: string | null;
}

export interface PersonalRecord {
  id: number;
  exercise_id: number;
  exercise?: Exercise;
  record_type: 'One Rep Max' | 'Volume' | 'Reps' | 'Distance' | 'Duration' | 'Weight for Reps';
  weight_kg: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  volume_kg: number | null;
  achieved_at: string;
  notes: string | null;
}
```

---

## Frontend Components

### Exercise Selector Component

```typescript
// components/fitness/ExerciseSelector.tsx
'use client';

import { useState, useEffect } from 'react';
import { Exercise } from '@/types/fitness';

interface ExerciseSelectorProps {
  onSelect: (exercise: Exercise) => void;
}

export function ExerciseSelector({ onSelect }: ExerciseSelectorProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadExercises();
  }, [category, search]);

  async function loadExercises() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (search) params.set('search', search);

      const response = await fetch(`/api/fitness/exercises?${params}`);
      const data = await response.json();
      setExercises(data.exercises);
    } catch (error) {
      console.error('Failed to load exercises:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Search exercises..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2 border rounded"
      />

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full px-4 py-2 border rounded"
      >
        <option value="">All Categories</option>
        <option value="Strength">Strength</option>
        <option value="Cardio">Cardio</option>
        <option value="Core">Core</option>
      </select>

      <div className="space-y-2">
        {loading ? (
          <p>Loading...</p>
        ) : (
          exercises.map((exercise) => (
            <button
              key={exercise.id}
              onClick={() => onSelect(exercise)}
              className="w-full text-left p-4 border rounded hover:bg-gray-50"
            >
              <div className="font-semibold">{exercise.name}</div>
              <div className="text-sm text-gray-600">
                {exercise.category} • {exercise.equipment}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
```

---

## Testing

### Unit Tests Example

```typescript
// __tests__/api/fitness/exercises.test.ts
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { sql } from '@vercel/postgres';

describe('Fitness API - Exercises', () => {
  let testExerciseId: number;

  beforeAll(async () => {
    // Create test exercise
    const result = await sql.query(`
      INSERT INTO fitness_exercises (name, is_custom, is_active)
      VALUES ('Test Exercise', TRUE, TRUE)
      RETURNING id
    `);
    testExerciseId = result.rows[0].id;
  });

  afterAll(async () => {
    // Clean up
    await sql.query('DELETE FROM fitness_exercises WHERE id = $1', [testExerciseId]);
  });

  it('should fetch exercises', async () => {
    const response = await fetch('http://localhost:3000/api/fitness/exercises');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data.exercises)).toBe(true);
  });

  it('should create custom exercise', async () => {
    const response = await fetch('http://localhost:3000/api/fitness/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Custom Test Exercise',
        category_id: 1,
        difficulty_level: 'Beginner'
      })
    });

    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.name).toBe('Custom Test Exercise');
    expect(data.is_custom).toBe(true);
  });
});
```

---

## Monitoring & Maintenance

### Database Maintenance Script

```typescript
// scripts/maintain-fitness-db.ts
import { sql } from '@vercel/postgres';

async function maintainFitnessDatabase() {
  console.log('Starting fitness database maintenance...');

  // 1. Clean up old Health Connect sync records (> 90 days)
  await sql.query(`
    DELETE FROM fitness_health_connect_sync
    WHERE synced_at < NOW() - INTERVAL '90 days'
      AND is_processed = TRUE
  `);

  // 2. Refresh materialized views if created
  // await sql.query('REFRESH MATERIALIZED VIEW fitness_exercise_stats');

  // 3. Analyze tables for query optimizer
  await sql.query('ANALYZE fitness_exercises');
  await sql.query('ANALYZE fitness_workouts');
  await sql.query('ANALYZE fitness_sets');

  // 4. Reindex if needed
  await sql.query('REINDEX TABLE fitness_sets');

  console.log('Maintenance complete!');
}

maintainFitnessDatabase().catch(console.error);
```

Schedule this to run weekly via cron or GitHub Actions.

---

## Next Steps

1. **Implement remaining API endpoints** (templates, measurements, photos)
2. **Build frontend UI** using your existing component library
3. **Add authentication** when user system is ready
4. **Create mobile app** for workout tracking
5. **Integrate Wear OS** for real-time tracking
6. **Build analytics dashboard** for progress visualization

---

## Troubleshooting

### Common Issues

**Issue: Foreign key constraint violation**
```
ERROR: insert or update on table "fitness_exercises" violates foreign key constraint
```

**Solution:** Ensure referenced IDs exist:
```sql
-- Check if category exists
SELECT * FROM fitness_exercise_categories WHERE id = 1;

-- Check if equipment exists
SELECT * FROM fitness_equipment_types WHERE id = 1;
```

**Issue: Duplicate set number**
```
ERROR: duplicate key value violates unique constraint "unique_workout_exercise_set"
```

**Solution:** Sets must have unique set_number per workout_exercise:
```typescript
// Get next set number
const result = await sql.query(`
  SELECT COALESCE(MAX(set_number), 0) + 1 as next_set
  FROM fitness_sets
  WHERE workout_exercise_id = $1
`, [workoutExerciseId]);

const nextSetNumber = result.rows[0].next_set;
```

---

For additional help, refer to the main FITNESS_SCHEMA_DOCUMENTATION.md file.
