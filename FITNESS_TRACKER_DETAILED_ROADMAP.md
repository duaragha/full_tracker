# Detailed Implementation Roadmap: Hevy-Style Fitness Tracking
## Full Tracker - Next.js 16 Application

**Last Updated:** 2025-11-14
**Estimated Timeline:** 12 weeks
**Target:** Production-ready fitness tracking with PWA capabilities

---

## Table of Contents
1. [Current State Analysis](#current-state-analysis)
2. [Architecture Overview](#architecture-overview)
3. [Phase 1: Core Features (Weeks 1-4)](#phase-1-core-features-weeks-1-4)
4. [Phase 2: Advanced Features (Weeks 5-8)](#phase-2-advanced-features-weeks-5-8)
5. [Phase 3: Integration & PWA (Weeks 9-12)](#phase-3-integration--pwa-weeks-9-12)
6. [File Structure](#file-structure)
7. [Testing Strategy](#testing-strategy)
8. [Performance Considerations](#performance-considerations)
9. [Deployment Guide](#deployment-guide)

---

## Current State Analysis

### Existing Infrastructure
```
✅ Next.js 16 with App Router
✅ PostgreSQL with migration system (30+ migrations)
✅ TypeScript throughout
✅ Radix UI + Tailwind CSS
✅ Server Actions pattern established
✅ Existing tracking for: Games, Books, Movies, TV Shows, PHEV, Inventory, Jobs
✅ Dashboard system with unified UI patterns
✅ Railway deployment configured
```

### Database Architecture
- **Connection Pool:** 20 connections (lib/db.ts)
- **Migration System:** Shell-based with SQL files
- **Indexing Strategy:** Status fields indexed, query performance monitoring
- **Current Migration Count:** 030 migrations

### Reusable Patterns to Leverage
1. **Card-based Dashboard UI** - Already built for multiple trackers
2. **Server Actions** - Pattern established in /app/actions/
3. **Modal System** - MediaDetailModal component for unified details view
4. **Status-based Filtering** - Used across Games, Books, TV Shows
5. **Time Tracking** - Implemented for Games (hours/minutes), Books (pages/time)

---

## Architecture Overview

### Technology Stack
```
Frontend:
- Next.js 16 (App Router)
- React 19.2.0
- TypeScript 5
- Tailwind CSS 4
- Radix UI components
- Recharts for analytics

Backend:
- Next.js API Routes
- PostgreSQL (via pg driver)
- Server Actions for mutations
- Connection pooling

State Management:
- React useState/useEffect
- Server Components for data fetching
- Client Components for interactivity

Future Additions:
- Redis for caching (Phase 2)
- Bull for background jobs (Phase 2)
- Service Workers for PWA (Phase 3)
```

### Design Principles
1. **Consistency:** Match existing UI patterns from Games/Books/TV trackers
2. **Performance:** Leverage indexes, caching, and optimistic updates
3. **Offline-First:** PWA capabilities for mobile gym use
4. **Progressive Enhancement:** Core features first, advanced features later

---

## Phase 1: Core Features (Weeks 1-4)

### Week 1: Database Schema & Migrations

#### Migration 031: Exercise Library
```sql
-- File: db/migrations/031_create_exercise_library.sql

-- Exercise library with comprehensive metadata
CREATE TABLE workout_exercises (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  equipment TEXT[], -- ['Barbell', 'Bench', 'Rack']
  primary_muscles TEXT[], -- ['Chest', 'Shoulders', 'Triceps']
  secondary_muscles TEXT[],
  movement_pattern TEXT, -- 'Push', 'Pull', 'Legs', 'Core'
  difficulty_level TEXT CHECK (difficulty_level IN ('Beginner', 'Intermediate', 'Advanced')),
  video_url TEXT,
  thumbnail_url TEXT,
  instructions TEXT[], -- Step-by-step instructions
  tips TEXT[], -- Form cues and safety tips
  is_custom BOOLEAN DEFAULT false,
  is_compound BOOLEAN DEFAULT false, -- Compound vs isolation
  created_by INTEGER, -- NULL for system exercises, user_id for custom
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags for flexible categorization
CREATE TABLE exercise_tags (
  id SERIAL PRIMARY KEY,
  exercise_id INTEGER REFERENCES workout_exercises(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exercise_id, tag)
);

-- Performance indexes
CREATE INDEX idx_exercises_name_search ON workout_exercises USING GIN(to_tsvector('english', name));
CREATE INDEX idx_exercises_muscles ON workout_exercises USING GIN(primary_muscles);
CREATE INDEX idx_exercises_equipment ON workout_exercises USING GIN(equipment);
CREATE INDEX idx_exercises_custom ON workout_exercises(is_custom) WHERE is_custom = true;
CREATE INDEX idx_exercise_tags_tag ON exercise_tags(tag);

-- Sample system exercises
INSERT INTO workout_exercises (name, description, equipment, primary_muscles, secondary_muscles, movement_pattern, difficulty_level, is_compound) VALUES
('Barbell Bench Press', 'Classic chest exercise performed on a flat bench', ARRAY['Barbell', 'Bench'], ARRAY['Chest'], ARRAY['Shoulders', 'Triceps'], 'Push', 'Beginner', true),
('Barbell Squat', 'Full body compound exercise targeting lower body', ARRAY['Barbell', 'Rack'], ARRAY['Quadriceps', 'Glutes'], ARRAY['Hamstrings', 'Core'], 'Legs', 'Beginner', true),
('Deadlift', 'Full body compound pulling exercise', ARRAY['Barbell'], ARRAY['Back', 'Glutes'], ARRAY['Hamstrings', 'Core', 'Traps'], 'Pull', 'Intermediate', true),
('Pull-ups', 'Bodyweight back exercise', ARRAY['Pull-up Bar'], ARRAY['Back'], ARRAY['Biceps', 'Shoulders'], 'Pull', 'Intermediate', true),
('Dumbbell Shoulder Press', 'Overhead pressing movement', ARRAY['Dumbbells'], ARRAY['Shoulders'], ARRAY['Triceps', 'Core'], 'Push', 'Beginner', true),
('Barbell Row', 'Horizontal pulling exercise for back', ARRAY['Barbell'], ARRAY['Back'], ARRAY['Biceps', 'Shoulders'], 'Pull', 'Intermediate', true),
('Romanian Deadlift', 'Hip hinge exercise targeting hamstrings', ARRAY['Barbell'], ARRAY['Hamstrings', 'Glutes'], ARRAY['Back', 'Core'], 'Pull', 'Intermediate', true),
('Leg Press', 'Machine-based quad exercise', ARRAY['Leg Press Machine'], ARRAY['Quadriceps'], ARRAY['Glutes', 'Hamstrings'], 'Legs', 'Beginner', false),
('Dumbbell Bicep Curl', 'Isolation exercise for biceps', ARRAY['Dumbbells'], ARRAY['Biceps'], ARRAY[], 'Pull', 'Beginner', false),
('Tricep Pushdown', 'Cable isolation for triceps', ARRAY['Cable Machine'], ARRAY['Triceps'], ARRAY[], 'Push', 'Beginner', false);
```

#### Migration 032: Workout Sessions & Sets
```sql
-- File: db/migrations/032_create_workout_sessions.sql

-- Workout sessions (equivalent to a single gym visit)
CREATE TABLE workout_sessions (
  id SERIAL PRIMARY KEY,
  routine_id INTEGER, -- Can be NULL for free-form workouts
  title TEXT, -- Optional custom title
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  total_volume_kg DECIMAL DEFAULT 0,
  total_reps INTEGER DEFAULT 0,
  total_sets INTEGER DEFAULT 0,
  total_exercises INTEGER DEFAULT 0,
  notes TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  location TEXT, -- e.g., 'Home Gym', 'GoodLife Fitness'
  body_weight_kg DECIMAL, -- Track body weight at session start
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual sets within a session
CREATE TABLE workout_sets (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id INTEGER REFERENCES workout_exercises(id),
  exercise_order INTEGER NOT NULL, -- Order within the session
  set_number INTEGER NOT NULL, -- 1, 2, 3, etc.
  reps INTEGER NOT NULL CHECK (reps >= 0),
  weight_kg DECIMAL NOT NULL CHECK (weight_kg >= 0),
  rpe INTEGER CHECK (rpe BETWEEN 1 AND 10), -- Rate of Perceived Exertion
  is_warmup BOOLEAN DEFAULT false,
  is_failure BOOLEAN DEFAULT false,
  is_dropset BOOLEAN DEFAULT false,
  rest_seconds INTEGER, -- Rest after this set
  notes TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Superset grouping (for tracking supersets/circuits)
CREATE TABLE workout_supersets (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES workout_sessions(id) ON DELETE CASCADE,
  superset_group INTEGER NOT NULL, -- Groups sets together
  set_id INTEGER REFERENCES workout_sets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, set_id)
);

-- Critical performance indexes
CREATE INDEX idx_sessions_started ON workout_sessions(started_at DESC);
CREATE INDEX idx_sessions_completed ON workout_sessions(completed_at DESC) WHERE completed_at IS NOT NULL;
CREATE INDEX idx_sessions_active ON workout_sessions(started_at DESC) WHERE completed_at IS NULL;
CREATE INDEX idx_sessions_routine ON workout_sessions(routine_id) WHERE routine_id IS NOT NULL;

CREATE INDEX idx_sets_session ON workout_sets(session_id, exercise_order, set_number);
CREATE INDEX idx_sets_exercise_date ON workout_sets(exercise_id, completed_at DESC);
CREATE INDEX idx_sets_session_exercise ON workout_sets(session_id, exercise_id);

CREATE INDEX idx_supersets_session ON workout_supersets(session_id, superset_group);
```

#### Migration 033: Routines & Templates
```sql
-- File: db/migrations/033_create_workout_routines.sql

-- Workout routines/templates
CREATE TABLE workout_routines (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_template BOOLEAN DEFAULT false, -- Template vs instance
  folder TEXT, -- For organizing routines (e.g., 'Push/Pull/Legs', '5x5')
  frequency_per_week INTEGER, -- Recommended frequency
  estimated_duration_minutes INTEGER,
  difficulty_level TEXT CHECK (difficulty_level IN ('Beginner', 'Intermediate', 'Advanced')),
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercises within a routine
CREATE TABLE routine_exercises (
  id SERIAL PRIMARY KEY,
  routine_id INTEGER REFERENCES workout_routines(id) ON DELETE CASCADE,
  exercise_id INTEGER REFERENCES workout_exercises(id),
  exercise_order INTEGER NOT NULL,
  target_sets INTEGER,
  target_reps_min INTEGER,
  target_reps_max INTEGER, -- For rep ranges (e.g., 8-12 reps)
  target_weight_kg DECIMAL,
  rest_seconds INTEGER DEFAULT 90,
  notes TEXT,
  superset_group INTEGER, -- Group exercises in supersets
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(routine_id, exercise_order)
);

-- Index for routine queries
CREATE INDEX idx_routines_template ON workout_routines(is_template) WHERE is_template = true;
CREATE INDEX idx_routines_folder ON workout_routines(folder) WHERE folder IS NOT NULL;
CREATE INDEX idx_routine_exercises_routine ON routine_exercises(routine_id, exercise_order);

-- Sample routines
INSERT INTO workout_routines (name, description, folder, frequency_per_week, estimated_duration_minutes, difficulty_level) VALUES
('Starting Strength', 'Classic beginner strength program focusing on compound movements', 'Strength', 3, 60, 'Beginner'),
('Push Pull Legs - Push Day', 'Upper body pushing exercises', 'Push/Pull/Legs', 2, 90, 'Intermediate'),
('Push Pull Legs - Pull Day', 'Upper body pulling exercises', 'Push/Pull/Legs', 2, 90, 'Intermediate'),
('Push Pull Legs - Leg Day', 'Lower body exercises', 'Push/Pull/Legs', 2, 90, 'Intermediate');
```

#### Migration 034: Personal Records & Analytics
```sql
-- File: db/migrations/034_create_personal_records.sql

-- Track personal records
CREATE TABLE personal_records (
  id SERIAL PRIMARY KEY,
  exercise_id INTEGER REFERENCES workout_exercises(id),
  record_type TEXT CHECK (record_type IN ('1rm', '3rm', '5rm', '10rm', 'volume_session', 'volume_week', 'max_reps')),
  value DECIMAL NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL,
  session_id INTEGER REFERENCES workout_sessions(id),
  reps INTEGER, -- For max_reps records
  weight_kg DECIMAL, -- For max_reps records
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exercise_id, record_type)
);

-- Track body measurements
CREATE TABLE body_measurements (
  id SERIAL PRIMARY KEY,
  measured_at TIMESTAMPTZ NOT NULL,
  body_weight_kg DECIMAL,
  body_fat_percentage DECIMAL,
  muscle_mass_kg DECIMAL,
  chest_cm DECIMAL,
  waist_cm DECIMAL,
  hips_cm DECIMAL,
  bicep_left_cm DECIMAL,
  bicep_right_cm DECIMAL,
  thigh_left_cm DECIMAL,
  thigh_right_cm DECIMAL,
  neck_cm DECIMAL,
  shoulders_cm DECIMAL,
  forearm_left_cm DECIMAL,
  forearm_right_cm DECIMAL,
  calf_left_cm DECIMAL,
  calf_right_cm DECIMAL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progress photos
CREATE TABLE body_photos (
  id SERIAL PRIMARY KEY,
  taken_at TIMESTAMPTZ NOT NULL,
  photo_url TEXT NOT NULL,
  photo_type TEXT CHECK (photo_type IN ('front', 'back', 'side_left', 'side_right', 'custom')),
  body_weight_kg DECIMAL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_personal_records_exercise ON personal_records(exercise_id, record_type);
CREATE INDEX idx_personal_records_achieved ON personal_records(achieved_at DESC);
CREATE INDEX idx_body_measurements_date ON body_measurements(measured_at DESC);
CREATE INDEX idx_body_photos_date ON body_photos(taken_at DESC);
```

**Deliverables Week 1:**
- ✅ 4 migration files created and tested
- ✅ Database schema supports 100+ exercises
- ✅ Indexes optimized for common queries
- ✅ Sample data seeded for testing

---

### Week 2: TypeScript Types & Service Layer

#### Core Types Definition
```typescript
// File: lib/types/workout.ts

export interface WorkoutExercise {
  id: number;
  name: string;
  description?: string;
  equipment?: string[];
  primary_muscles?: string[];
  secondary_muscles?: string[];
  movement_pattern?: 'Push' | 'Pull' | 'Legs' | 'Core';
  difficulty_level?: 'Beginner' | 'Intermediate' | 'Advanced';
  video_url?: string;
  thumbnail_url?: string;
  instructions?: string[];
  tips?: string[];
  is_custom: boolean;
  is_compound: boolean;
  created_by?: number;
  created_at: Date;
  updated_at: Date;
}

export interface WorkoutSession {
  id: number;
  routine_id?: number;
  title?: string;
  started_at: Date;
  completed_at?: Date;
  duration_seconds?: number;
  total_volume_kg: number;
  total_reps: number;
  total_sets: number;
  total_exercises: number;
  notes?: string;
  rating?: number;
  location?: string;
  body_weight_kg?: number;
  created_at: Date;
  updated_at: Date;
  // Relations
  sets?: WorkoutSet[];
  routine?: WorkoutRoutine;
}

export interface WorkoutSet {
  id: number;
  session_id: number;
  exercise_id: number;
  exercise_order: number;
  set_number: number;
  reps: number;
  weight_kg: number;
  rpe?: number;
  is_warmup: boolean;
  is_failure: boolean;
  is_dropset: boolean;
  rest_seconds?: number;
  notes?: string;
  completed_at: Date;
  created_at: Date;
  // Relations
  exercise?: WorkoutExercise;
}

export interface WorkoutRoutine {
  id: number;
  name: string;
  description?: string;
  is_template: boolean;
  folder?: string;
  frequency_per_week?: number;
  estimated_duration_minutes?: number;
  difficulty_level?: 'Beginner' | 'Intermediate' | 'Advanced';
  is_archived: boolean;
  created_at: Date;
  updated_at: Date;
  // Relations
  exercises?: RoutineExercise[];
}

export interface RoutineExercise {
  id: number;
  routine_id: number;
  exercise_id: number;
  exercise_order: number;
  target_sets?: number;
  target_reps_min?: number;
  target_reps_max?: number;
  target_weight_kg?: number;
  rest_seconds: number;
  notes?: string;
  superset_group?: number;
  created_at: Date;
  // Relations
  exercise?: WorkoutExercise;
}

export interface PersonalRecord {
  id: number;
  exercise_id: number;
  record_type: '1rm' | '3rm' | '5rm' | '10rm' | 'volume_session' | 'volume_week' | 'max_reps';
  value: number;
  achieved_at: Date;
  session_id?: number;
  reps?: number;
  weight_kg?: number;
  created_at: Date;
  // Relations
  exercise?: WorkoutExercise;
}

export interface BodyMeasurement {
  id: number;
  measured_at: Date;
  body_weight_kg?: number;
  body_fat_percentage?: number;
  muscle_mass_kg?: number;
  chest_cm?: number;
  waist_cm?: number;
  hips_cm?: number;
  bicep_left_cm?: number;
  bicep_right_cm?: number;
  thigh_left_cm?: number;
  thigh_right_cm?: number;
  neck_cm?: number;
  shoulders_cm?: number;
  notes?: string;
  created_at: Date;
}

export interface WorkoutStats {
  total_sessions: number;
  total_completed_sessions: number;
  total_volume_kg: number;
  total_sets: number;
  total_reps: number;
  avg_session_duration_minutes: number;
  workout_days: number;
  current_streak: number;
  longest_streak: number;
  favorite_exercises: Array<{
    exercise_id: number;
    exercise_name: string;
    times_performed: number;
  }>;
}

// Request/Response types for API
export interface CreateSessionRequest {
  routine_id?: number;
  title?: string;
  location?: string;
  body_weight_kg?: number;
}

export interface AddSetRequest {
  session_id: number;
  exercise_id: number;
  exercise_order: number;
  set_number: number;
  reps: number;
  weight_kg: number;
  rpe?: number;
  is_warmup?: boolean;
  is_failure?: boolean;
  rest_seconds?: number;
  notes?: string;
}

export interface CompleteSessionRequest {
  session_id: number;
  rating?: number;
  notes?: string;
}
```

#### Service Layer Implementation
```typescript
// File: lib/services/workout.service.ts

import { db } from '@/lib/db';
import type {
  WorkoutSession,
  WorkoutSet,
  WorkoutExercise,
  PersonalRecord,
  WorkoutStats,
  CreateSessionRequest,
  AddSetRequest,
  CompleteSessionRequest
} from '@/lib/types/workout';

export class WorkoutService {
  /**
   * Create a new workout session
   */
  static async createSession(data: CreateSessionRequest): Promise<WorkoutSession> {
    const result = await db.query(`
      INSERT INTO workout_sessions (
        routine_id, title, location, body_weight_kg, started_at
      )
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `, [
      data.routine_id || null,
      data.title || null,
      data.location || null,
      data.body_weight_kg || null
    ]);

    return result.rows[0];
  }

  /**
   * Get workout session by ID with all sets and exercise details
   */
  static async getSession(session_id: number): Promise<WorkoutSession | null> {
    // Get session
    const sessionResult = await db.query(`
      SELECT ws.*, wr.name as routine_name
      FROM workout_sessions ws
      LEFT JOIN workout_routines wr ON ws.routine_id = wr.id
      WHERE ws.id = $1
    `, [session_id]);

    if (sessionResult.rows.length === 0) return null;

    // Get sets with exercise details
    const setsResult = await db.query(`
      SELECT
        s.*,
        e.name as exercise_name,
        e.primary_muscles,
        e.equipment
      FROM workout_sets s
      JOIN workout_exercises e ON s.exercise_id = e.id
      WHERE s.session_id = $1
      ORDER BY s.exercise_order, s.set_number
    `, [session_id]);

    return {
      ...sessionResult.rows[0],
      sets: setsResult.rows
    };
  }

  /**
   * Get active (incomplete) workout session
   */
  static async getActiveSession(): Promise<WorkoutSession | null> {
    const result = await db.query(`
      SELECT ws.*, wr.name as routine_name
      FROM workout_sessions ws
      LEFT JOIN workout_routines wr ON ws.routine_id = wr.id
      WHERE ws.completed_at IS NULL
      ORDER BY ws.started_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) return null;

    const session = result.rows[0];
    const setsResult = await db.query(`
      SELECT
        s.*,
        e.name as exercise_name,
        e.primary_muscles
      FROM workout_sets s
      JOIN workout_exercises e ON s.exercise_id = e.id
      WHERE s.session_id = $1
      ORDER BY s.exercise_order, s.set_number
    `, [session.id]);

    return {
      ...session,
      sets: setsResult.rows
    };
  }

  /**
   * Add a set to a workout session
   */
  static async addSet(data: AddSetRequest): Promise<WorkoutSet> {
    const result = await db.query(`
      INSERT INTO workout_sets (
        session_id, exercise_id, exercise_order, set_number,
        reps, weight_kg, rpe, is_warmup, is_failure, rest_seconds, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      data.session_id,
      data.exercise_id,
      data.exercise_order,
      data.set_number,
      data.reps,
      data.weight_kg,
      data.rpe || null,
      data.is_warmup || false,
      data.is_failure || false,
      data.rest_seconds || null,
      data.notes || null
    ]);

    // Update session totals
    await this.updateSessionTotals(data.session_id);

    return result.rows[0];
  }

  /**
   * Update a set
   */
  static async updateSet(
    set_id: number,
    updates: Partial<Omit<WorkoutSet, 'id' | 'session_id' | 'created_at'>>
  ): Promise<WorkoutSet> {
    const setFields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      setFields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }

    values.push(set_id);

    const result = await db.query(`
      UPDATE workout_sets
      SET ${setFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    // Get session_id to update totals
    const sessionResult = await db.query(
      'SELECT session_id FROM workout_sets WHERE id = $1',
      [set_id]
    );

    if (sessionResult.rows.length > 0) {
      await this.updateSessionTotals(sessionResult.rows[0].session_id);
    }

    return result.rows[0];
  }

  /**
   * Delete a set
   */
  static async deleteSet(set_id: number): Promise<void> {
    const sessionResult = await db.query(
      'SELECT session_id FROM workout_sets WHERE id = $1',
      [set_id]
    );

    await db.query('DELETE FROM workout_sets WHERE id = $1', [set_id]);

    if (sessionResult.rows.length > 0) {
      await this.updateSessionTotals(sessionResult.rows[0].session_id);
    }
  }

  /**
   * Complete a workout session
   */
  static async completeSession(data: CompleteSessionRequest): Promise<WorkoutSession> {
    const completed_at = new Date();

    // Get session start time
    const session = await this.getSession(data.session_id);
    if (!session) throw new Error('Session not found');

    const duration_seconds = Math.floor(
      (completed_at.getTime() - new Date(session.started_at).getTime()) / 1000
    );

    const result = await db.query(`
      UPDATE workout_sessions
      SET
        completed_at = $1,
        duration_seconds = $2,
        rating = $3,
        notes = COALESCE($4, notes),
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [
      completed_at,
      duration_seconds,
      data.rating || null,
      data.notes || null,
      data.session_id
    ]);

    // Check for personal records (async, don't wait)
    this.checkPersonalRecords(data.session_id).catch(err =>
      console.error('Error checking PRs:', err)
    );

    return result.rows[0];
  }

  /**
   * Update session totals (volume, sets, reps, exercises)
   */
  private static async updateSessionTotals(session_id: number): Promise<void> {
    await db.query(`
      UPDATE workout_sessions
      SET
        total_volume_kg = (
          SELECT COALESCE(SUM(reps * weight_kg), 0)
          FROM workout_sets
          WHERE session_id = $1 AND is_warmup = false
        ),
        total_reps = (
          SELECT COALESCE(SUM(reps), 0)
          FROM workout_sets
          WHERE session_id = $1 AND is_warmup = false
        ),
        total_sets = (
          SELECT COUNT(*)
          FROM workout_sets
          WHERE session_id = $1 AND is_warmup = false
        ),
        total_exercises = (
          SELECT COUNT(DISTINCT exercise_id)
          FROM workout_sets
          WHERE session_id = $1
        ),
        updated_at = NOW()
      WHERE id = $1
    `, [session_id]);
  }

  /**
   * Check for personal records after session completion
   */
  private static async checkPersonalRecords(session_id: number): Promise<void> {
    // Get all working sets (exclude warmups)
    const sets = await db.query(`
      SELECT exercise_id, reps, weight_kg
      FROM workout_sets
      WHERE session_id = $1 AND is_warmup = false
      ORDER BY exercise_id, weight_kg DESC, reps DESC
    `, [session_id]);

    // Group by exercise
    const exerciseMap = new Map<number, Array<{ reps: number; weight_kg: number }>>();
    for (const set of sets.rows) {
      if (!exerciseMap.has(set.exercise_id)) {
        exerciseMap.set(set.exercise_id, []);
      }
      exerciseMap.get(set.exercise_id)!.push({
        reps: set.reps,
        weight_kg: set.weight_kg
      });
    }

    // Check each exercise for PRs
    for (const [exercise_id, exerciseSets] of exerciseMap) {
      await this.updatePersonalRecords(exercise_id, exerciseSets, session_id);
    }
  }

  /**
   * Update personal records for an exercise
   * Uses Brzycki formula for 1RM estimation: 1RM = weight × (36 / (37 - reps))
   */
  private static async updatePersonalRecords(
    exercise_id: number,
    sets: Array<{ reps: number; weight_kg: number }>,
    session_id: number
  ): Promise<void> {
    // Calculate estimated 1RMs
    const rmsWithData = sets.map(set => ({
      estimated_1rm: set.reps === 1 ? set.weight_kg : set.weight_kg * (36 / (37 - set.reps)),
      reps: set.reps,
      weight_kg: set.weight_kg
    }));

    // Best estimated 1RM
    const best1RM = Math.max(...rmsWithData.map(r => r.estimated_1rm));

    // Update 1RM PR
    await db.query(`
      INSERT INTO personal_records (exercise_id, record_type, value, achieved_at, session_id)
      VALUES ($1, '1rm', $2, NOW(), $3)
      ON CONFLICT (exercise_id, record_type)
      DO UPDATE SET
        value = EXCLUDED.value,
        achieved_at = EXCLUDED.achieved_at,
        session_id = EXCLUDED.session_id
      WHERE EXCLUDED.value > personal_records.value
    `, [exercise_id, best1RM, session_id]);

    // Check for rep-based PRs (3rm, 5rm, 10rm)
    const repRanges = [
      { min: 3, max: 3, type: '3rm' },
      { min: 5, max: 5, type: '5rm' },
      { min: 10, max: 10, type: '10rm' }
    ];

    for (const range of repRanges) {
      const setsInRange = sets.filter(s => s.reps >= range.min && s.reps <= range.max);
      if (setsInRange.length > 0) {
        const maxWeight = Math.max(...setsInRange.map(s => s.weight_kg));

        await db.query(`
          INSERT INTO personal_records (exercise_id, record_type, value, achieved_at, session_id)
          VALUES ($1, $2, $3, NOW(), $4)
          ON CONFLICT (exercise_id, record_type)
          DO UPDATE SET
            value = EXCLUDED.value,
            achieved_at = EXCLUDED.achieved_at,
            session_id = EXCLUDED.session_id
          WHERE EXCLUDED.value > personal_records.value
        `, [exercise_id, range.type, maxWeight, session_id]);
      }
    }

    // Session volume PR
    const sessionVolume = sets.reduce((sum, set) => sum + (set.reps * set.weight_kg), 0);
    await db.query(`
      INSERT INTO personal_records (exercise_id, record_type, value, achieved_at, session_id)
      VALUES ($1, 'volume_session', $2, NOW(), $3)
      ON CONFLICT (exercise_id, record_type)
      DO UPDATE SET
        value = EXCLUDED.value,
        achieved_at = EXCLUDED.achieved_at,
        session_id = EXCLUDED.session_id
      WHERE EXCLUDED.value > personal_records.value
    `, [exercise_id, sessionVolume, session_id]);
  }

  /**
   * Get workout statistics
   */
  static async getStats(days: number = 30): Promise<WorkoutStats> {
    const statsResult = await db.query(`
      SELECT
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as total_completed_sessions,
        COALESCE(SUM(total_volume_kg), 0) as total_volume_kg,
        COALESCE(SUM(total_sets), 0) as total_sets,
        COALESCE(SUM(total_reps), 0) as total_reps,
        COALESCE(AVG(duration_seconds) / 60, 0) as avg_session_duration_minutes,
        COUNT(DISTINCT DATE(started_at)) as workout_days
      FROM workout_sessions
      WHERE started_at > NOW() - INTERVAL '1 day' * $1
    `, [days]);

    const stats = statsResult.rows[0];

    // Calculate streak (consecutive workout days)
    const streakResult = await db.query(`
      WITH daily_workouts AS (
        SELECT DISTINCT DATE(started_at) as workout_date
        FROM workout_sessions
        WHERE completed_at IS NOT NULL
        ORDER BY workout_date DESC
      ),
      streak_data AS (
        SELECT
          workout_date,
          workout_date - (ROW_NUMBER() OVER (ORDER BY workout_date DESC))::int AS streak_group
        FROM daily_workouts
      )
      SELECT
        COUNT(*) as streak_length,
        MIN(workout_date) as streak_start,
        MAX(workout_date) as streak_end
      FROM streak_data
      WHERE streak_group = (
        SELECT workout_date - (ROW_NUMBER() OVER (ORDER BY workout_date DESC))::int
        FROM daily_workouts
        LIMIT 1
      )
    `);

    const currentStreak = streakResult.rows[0]?.streak_length || 0;

    // Get favorite exercises
    const favoritesResult = await db.query(`
      SELECT
        e.id as exercise_id,
        e.name as exercise_name,
        COUNT(DISTINCT s.session_id) as times_performed
      FROM workout_sets s
      JOIN workout_exercises e ON s.exercise_id = e.id
      JOIN workout_sessions ws ON s.session_id = ws.id
      WHERE ws.started_at > NOW() - INTERVAL '1 day' * $1
      GROUP BY e.id, e.name
      ORDER BY times_performed DESC
      LIMIT 5
    `, [days]);

    return {
      ...stats,
      current_streak: currentStreak,
      longest_streak: currentStreak, // TODO: Calculate actual longest streak
      favorite_exercises: favoritesResult.rows
    };
  }

  /**
   * Get recent workout sessions
   */
  static async getRecentSessions(limit: number = 10): Promise<WorkoutSession[]> {
    const result = await db.query(`
      SELECT
        ws.*,
        wr.name as routine_name,
        COUNT(DISTINCT s.exercise_id) as exercise_count
      FROM workout_sessions ws
      LEFT JOIN workout_routines wr ON ws.routine_id = wr.id
      LEFT JOIN workout_sets s ON ws.id = s.session_id
      GROUP BY ws.id, wr.name
      ORDER BY ws.started_at DESC
      LIMIT $1
    `, [limit]);

    return result.rows;
  }

  /**
   * Get exercise volume over time (for charts)
   */
  static async getExerciseVolume(
    exercise_id: number,
    days: number = 90
  ): Promise<Array<{ date: string; volume_kg: number; total_sets: number; avg_weight: number }>> {
    const result = await db.query(`
      SELECT
        DATE(ws.completed_at) as date,
        SUM(s.reps * s.weight_kg) as volume_kg,
        COUNT(*) as total_sets,
        AVG(s.weight_kg) as avg_weight,
        MAX(s.weight_kg) as max_weight
      FROM workout_sets s
      JOIN workout_sessions ws ON s.session_id = ws.id
      WHERE s.exercise_id = $1
        AND s.is_warmup = false
        AND ws.completed_at IS NOT NULL
        AND ws.completed_at > NOW() - INTERVAL '1 day' * $2
      GROUP BY DATE(ws.completed_at)
      ORDER BY date ASC
    `, [exercise_id, days]);

    return result.rows;
  }

  /**
   * Get exercise history (for progression tracking)
   */
  static async getExerciseHistory(
    exercise_id: number,
    limit: number = 20
  ): Promise<Array<WorkoutSet & { session_date: Date }>> {
    const result = await db.query(`
      SELECT
        s.*,
        ws.completed_at as session_date,
        ws.id as session_id
      FROM workout_sets s
      JOIN workout_sessions ws ON s.session_id = ws.id
      WHERE s.exercise_id = $1
        AND s.is_warmup = false
        AND ws.completed_at IS NOT NULL
      ORDER BY ws.completed_at DESC, s.set_number ASC
      LIMIT $1
    `, [exercise_id, limit]);

    return result.rows;
  }
}
```

```typescript
// File: lib/services/exercise.service.ts

import { db } from '@/lib/db';
import type { WorkoutExercise } from '@/lib/types/workout';

export class ExerciseService {
  /**
   * Search exercises by name, muscles, or equipment
   */
  static async searchExercises(query: string): Promise<WorkoutExercise[]> {
    const result = await db.query(`
      SELECT DISTINCT e.*
      FROM workout_exercises e
      WHERE
        e.name ILIKE $1
        OR $2 = ANY(e.primary_muscles)
        OR $2 = ANY(e.secondary_muscles)
        OR $2 = ANY(e.equipment)
      ORDER BY e.name
      LIMIT 50
    `, [`%${query}%`, query]);

    return result.rows;
  }

  /**
   * Get exercises by filter
   */
  static async getExercises(filters: {
    muscle?: string;
    equipment?: string;
    movement_pattern?: string;
    difficulty_level?: string;
    is_compound?: boolean;
  }): Promise<WorkoutExercise[]> {
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (filters.muscle) {
      conditions.push(`$${paramIndex} = ANY(e.primary_muscles)`);
      values.push(filters.muscle);
      paramIndex++;
    }

    if (filters.equipment) {
      conditions.push(`$${paramIndex} = ANY(e.equipment)`);
      values.push(filters.equipment);
      paramIndex++;
    }

    if (filters.movement_pattern) {
      conditions.push(`e.movement_pattern = $${paramIndex}`);
      values.push(filters.movement_pattern);
      paramIndex++;
    }

    if (filters.difficulty_level) {
      conditions.push(`e.difficulty_level = $${paramIndex}`);
      values.push(filters.difficulty_level);
      paramIndex++;
    }

    if (filters.is_compound !== undefined) {
      conditions.push(`e.is_compound = $${paramIndex}`);
      values.push(filters.is_compound);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await db.query(`
      SELECT e.*
      FROM workout_exercises e
      ${whereClause}
      ORDER BY e.name
    `, values);

    return result.rows;
  }

  /**
   * Get exercise by ID
   */
  static async getExerciseById(id: number): Promise<WorkoutExercise | null> {
    const result = await db.query(
      'SELECT * FROM workout_exercises WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Create custom exercise
   */
  static async createCustomExercise(
    data: Omit<WorkoutExercise, 'id' | 'created_at' | 'updated_at'>
  ): Promise<WorkoutExercise> {
    const result = await db.query(`
      INSERT INTO workout_exercises (
        name, description, equipment, primary_muscles, secondary_muscles,
        movement_pattern, difficulty_level, video_url, thumbnail_url,
        instructions, tips, is_custom, is_compound, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      data.name,
      data.description || null,
      data.equipment || null,
      data.primary_muscles || null,
      data.secondary_muscles || null,
      data.movement_pattern || null,
      data.difficulty_level || null,
      data.video_url || null,
      data.thumbnail_url || null,
      data.instructions || null,
      data.tips || null,
      true, // is_custom
      data.is_compound,
      data.created_by || null
    ]);

    return result.rows[0];
  }

  /**
   * Get all muscle groups
   */
  static async getMuscleGroups(): Promise<string[]> {
    const result = await db.query(`
      SELECT DISTINCT unnest(primary_muscles) as muscle
      FROM workout_exercises
      WHERE primary_muscles IS NOT NULL
      ORDER BY muscle
    `);

    return result.rows.map(r => r.muscle);
  }

  /**
   * Get all equipment types
   */
  static async getEquipmentTypes(): Promise<string[]> {
    const result = await db.query(`
      SELECT DISTINCT unnest(equipment) as equipment_type
      FROM workout_exercises
      WHERE equipment IS NOT NULL
      ORDER BY equipment_type
    `);

    return result.rows.map(r => r.equipment_type);
  }
}
```

**Deliverables Week 2:**
- ✅ Complete TypeScript type definitions
- ✅ Service layer with 20+ methods
- ✅ Query optimization and error handling
- ✅ JSDoc comments for all methods

---

### Week 3: Server Actions & API Routes

#### Server Actions
```typescript
// File: app/actions/workouts.ts

'use server';

import { WorkoutService } from '@/lib/services/workout.service';
import { ExerciseService } from '@/lib/services/exercise.service';
import { revalidatePath } from 'next/cache';
import type {
  WorkoutSession,
  WorkoutSet,
  CreateSessionRequest,
  AddSetRequest,
  CompleteSessionRequest
} from '@/lib/types/workout';

/**
 * Create a new workout session
 */
export async function createWorkoutSessionAction(
  data: CreateSessionRequest
): Promise<WorkoutSession> {
  try {
    const session = await WorkoutService.createSession(data);
    revalidatePath('/workouts');
    return session;
  } catch (error) {
    console.error('Error creating workout session:', error);
    throw new Error('Failed to create workout session');
  }
}

/**
 * Get active workout session
 */
export async function getActiveWorkoutSessionAction(): Promise<WorkoutSession | null> {
  try {
    return await WorkoutService.getActiveSession();
  } catch (error) {
    console.error('Error fetching active session:', error);
    return null;
  }
}

/**
 * Get workout session by ID
 */
export async function getWorkoutSessionAction(id: number): Promise<WorkoutSession | null> {
  try {
    return await WorkoutService.getSession(id);
  } catch (error) {
    console.error('Error fetching workout session:', error);
    return null;
  }
}

/**
 * Add set to workout
 */
export async function addWorkoutSetAction(data: AddSetRequest): Promise<WorkoutSet> {
  try {
    const set = await WorkoutService.addSet(data);
    revalidatePath('/workouts');
    revalidatePath(`/workouts/${data.session_id}`);
    return set;
  } catch (error) {
    console.error('Error adding workout set:', error);
    throw new Error('Failed to add set');
  }
}

/**
 * Update a workout set
 */
export async function updateWorkoutSetAction(
  set_id: number,
  updates: Partial<WorkoutSet>
): Promise<WorkoutSet> {
  try {
    const set = await WorkoutService.updateSet(set_id, updates);
    revalidatePath('/workouts');
    return set;
  } catch (error) {
    console.error('Error updating workout set:', error);
    throw new Error('Failed to update set');
  }
}

/**
 * Delete a workout set
 */
export async function deleteWorkoutSetAction(set_id: number): Promise<void> {
  try {
    await WorkoutService.deleteSet(set_id);
    revalidatePath('/workouts');
  } catch (error) {
    console.error('Error deleting workout set:', error);
    throw new Error('Failed to delete set');
  }
}

/**
 * Complete workout session
 */
export async function completeWorkoutSessionAction(
  data: CompleteSessionRequest
): Promise<WorkoutSession> {
  try {
    const session = await WorkoutService.completeSession(data);
    revalidatePath('/workouts');
    revalidatePath('/workouts/history');
    return session;
  } catch (error) {
    console.error('Error completing workout session:', error);
    throw new Error('Failed to complete workout');
  }
}

/**
 * Get workout statistics
 */
export async function getWorkoutStatsAction(days: number = 30) {
  try {
    return await WorkoutService.getStats(days);
  } catch (error) {
    console.error('Error fetching workout stats:', error);
    return null;
  }
}

/**
 * Get recent workout sessions
 */
export async function getRecentWorkoutsAction(limit: number = 10) {
  try {
    return await WorkoutService.getRecentSessions(limit);
  } catch (error) {
    console.error('Error fetching recent workouts:', error);
    return [];
  }
}

/**
 * Search exercises
 */
export async function searchExercisesAction(query: string) {
  try {
    return await ExerciseService.searchExercises(query);
  } catch (error) {
    console.error('Error searching exercises:', error);
    return [];
  }
}

/**
 * Get exercises by filters
 */
export async function getExercisesAction(filters: any) {
  try {
    return await ExerciseService.getExercises(filters);
  } catch (error) {
    console.error('Error fetching exercises:', error);
    return [];
  }
}

/**
 * Get exercise volume history
 */
export async function getExerciseVolumeAction(exercise_id: number, days: number = 90) {
  try {
    return await WorkoutService.getExerciseVolume(exercise_id, days);
  } catch (error) {
    console.error('Error fetching exercise volume:', error);
    return [];
  }
}

/**
 * Get exercise history
 */
export async function getExerciseHistoryAction(exercise_id: number, limit: number = 20) {
  try {
    return await WorkoutService.getExerciseHistory(exercise_id, limit);
  } catch (error) {
    console.error('Error fetching exercise history:', error);
    return [];
  }
}
```

#### API Routes (for future external access/PWA)
```typescript
// File: app/api/workouts/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { WorkoutService } from '@/lib/services/workout.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workouts - Get workout statistics
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');
    const limit = parseInt(searchParams.get('limit') || '10');

    const [stats, recent] = await Promise.all([
      WorkoutService.getStats(days),
      WorkoutService.getRecentSessions(limit)
    ]);

    return NextResponse.json({
      success: true,
      data: { stats, recent }
    });
  } catch (error) {
    console.error('Error in GET /api/workouts:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workouts - Create new workout session
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const session = await WorkoutService.createSession(body);

    return NextResponse.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error in POST /api/workouts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
```

```typescript
// File: app/api/workouts/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { WorkoutService } from '@/lib/services/workout.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workouts/[id] - Get workout session details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session_id = parseInt(params.id);
    const session = await WorkoutService.getSession(session_id);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error in GET /api/workouts/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/workouts/[id] - Update workout session
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session_id = parseInt(params.id);
    const body = await req.json();

    if (body.complete) {
      const session = await WorkoutService.completeSession({
        session_id,
        rating: body.rating,
        notes: body.notes
      });

      return NextResponse.json({
        success: true,
        data: session
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid update operation' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in PATCH /api/workouts/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

```typescript
// File: app/api/workouts/[id]/sets/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { WorkoutService } from '@/lib/services/workout.service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/workouts/[id]/sets - Add set to workout
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session_id = parseInt(params.id);
    const body = await req.json();

    const set = await WorkoutService.addSet({
      session_id,
      ...body
    });

    return NextResponse.json({
      success: true,
      data: set
    });
  } catch (error) {
    console.error('Error in POST /api/workouts/[id]/sets:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add set' },
      { status: 500 }
    );
  }
}
```

```typescript
// File: app/api/exercises/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { ExerciseService } from '@/lib/services/exercise.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/exercises - Search and filter exercises
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const muscle = searchParams.get('muscle');
    const equipment = searchParams.get('equipment');
    const movement_pattern = searchParams.get('movement_pattern');

    let exercises;

    if (query) {
      exercises = await ExerciseService.searchExercises(query);
    } else {
      exercises = await ExerciseService.getExercises({
        muscle: muscle || undefined,
        equipment: equipment || undefined,
        movement_pattern: movement_pattern || undefined
      });
    }

    return NextResponse.json({
      success: true,
      data: exercises
    });
  } catch (error) {
    console.error('Error in GET /api/exercises:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Deliverables Week 3:**
- ✅ 10+ server actions for client components
- ✅ RESTful API routes for external access
- ✅ Error handling and validation
- ✅ Revalidation paths for cache management

---

### Week 4: Basic UI Components

#### Workout Dashboard Page
```typescript
// File: app/workouts/page.tsx

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getWorkoutStatsAction, getRecentWorkoutsAction, getActiveWorkoutSessionAction } from '@/app/actions/workouts';
import { Dumbbell, TrendingUp, Calendar, Clock, Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function WorkoutsPage() {
  const [stats, recentWorkouts, activeSession] = await Promise.all([
    getWorkoutStatsAction(30),
    getRecentWorkoutsAction(10),
    getActiveWorkoutSessionAction()
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workouts</h1>
          <p className="text-muted-foreground">Track your fitness progress</p>
        </div>
        <Button asChild size="lg">
          <Link href="/workouts/session/new">
            <Plus className="w-4 h-4 mr-2" />
            Start Workout
          </Link>
        </Button>
      </div>

      {/* Active Session Alert */}
      {activeSession && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 animate-pulse" />
              Active Workout
            </CardTitle>
            <CardDescription>
              Started {new Date(activeSession.started_at).toLocaleTimeString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm">
                  {activeSession.total_sets} sets • {activeSession.total_exercises} exercises
                </p>
                <p className="text-sm text-muted-foreground">
                  {activeSession.total_volume_kg.toFixed(0)} kg total volume
                </p>
              </div>
              <Button asChild>
                <Link href={`/workouts/session/${activeSession.id}`}>
                  Continue
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Dumbbell className="w-4 h-4" />
              Total Workouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_completed_sessions || 0}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Total Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.total_volume_kg ? (stats.total_volume_kg / 1000).toFixed(1) : 0}t
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.total_sets || 0} sets • {stats?.total_reps || 0} reps
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Avg Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.avg_session_duration_minutes ? Math.round(stats.avg_session_duration_minutes) : 0}m
            </div>
            <p className="text-xs text-muted-foreground">Per workout</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Current Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.current_streak || 0}</div>
            <p className="text-xs text-muted-foreground">Days in a row</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Workouts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Workouts</CardTitle>
              <CardDescription>Your workout history</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/workouts/history">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentWorkouts && recentWorkouts.length > 0 ? (
            <div className="space-y-3">
              {recentWorkouts.map((workout) => (
                <Link
                  key={workout.id}
                  href={`/workouts/session/${workout.id}`}
                  className="block p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">
                        {workout.title || workout.routine_name || 'Free Workout'}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(workout.started_at).toLocaleDateString()} •{' '}
                        {workout.total_exercises} exercises • {workout.total_sets} sets
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{(workout.total_volume_kg / 1000).toFixed(1)}t</p>
                      <p className="text-sm text-muted-foreground">
                        {workout.duration_seconds ? Math.round(workout.duration_seconds / 60) : 0}m
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No workouts yet. Start your first workout!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <Link href="/workouts/exercises">
            <CardHeader>
              <CardTitle className="text-base">Exercise Library</CardTitle>
              <CardDescription>Browse and search exercises</CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <Link href="/workouts/routines">
            <CardHeader>
              <CardTitle className="text-base">Workout Routines</CardTitle>
              <CardDescription>Create and manage routines</CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <Link href="/workouts/analytics">
            <CardHeader>
              <CardTitle className="text-base">Analytics</CardTitle>
              <CardDescription>View progress and insights</CardDescription>
            </CardHeader>
          </Link>
        </Card>
      </div>
    </div>
  );
}
```

#### Exercise Library Component
```typescript
// File: app/workouts/exercises/exercises-library-client.tsx

'use client';

import * as React from 'react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';
import type { WorkoutExercise } from '@/lib/types/workout';

interface ExercisesLibraryClientProps {
  initialExercises: WorkoutExercise[];
  muscles: string[];
  equipment: string[];
}

export function ExercisesLibraryClient({
  initialExercises,
  muscles,
  equipment
}: ExercisesLibraryClientProps) {
  const [exercises, setExercises] = useState(initialExercises);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (selectedMuscle !== 'all') params.append('muscle', selectedMuscle);
      if (selectedEquipment !== 'all') params.append('equipment', selectedEquipment);

      const response = await fetch(`/api/exercises?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setExercises(data.data);
      }
    } catch (error) {
      console.error('Error searching exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedMuscle, selectedEquipment]);

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedMuscle} onValueChange={setSelectedMuscle}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Muscle Group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Muscles</SelectItem>
            {muscles.map((muscle) => (
              <SelectItem key={muscle} value={muscle}>
                {muscle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Equipment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Equipment</SelectItem>
            {equipment.map((eq) => (
              <SelectItem key={eq} value={eq}>
                {eq}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Exercise Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading exercises...</p>
        </div>
      ) : exercises.length > 0 ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {exercises.map((exercise) => (
            <Card key={exercise.id} className="hover:border-primary transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{exercise.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {exercise.description || 'No description available'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {exercise.primary_muscles?.slice(0, 3).map((muscle) => (
                    <Badge key={muscle} variant="default" className="text-xs">
                      {muscle}
                    </Badge>
                  ))}
                  {exercise.is_compound && (
                    <Badge variant="secondary" className="text-xs">
                      Compound
                    </Badge>
                  )}
                </div>

                {exercise.equipment && exercise.equipment.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Equipment: {exercise.equipment.join(', ')}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {exercise.difficulty_level || 'Beginner'}
                  </span>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No exercises found. Try different filters.</p>
        </div>
      )}
    </div>
  );
}
```

```typescript
// File: app/workouts/exercises/page.tsx

import { ExercisesLibraryClient } from './exercises-library-client';
import { ExerciseService } from '@/lib/services/exercise.service';

export const dynamic = 'force-dynamic';

export default async function ExercisesPage() {
  const [exercises, muscles, equipment] = await Promise.all([
    ExerciseService.getExercises({}),
    ExerciseService.getMuscleGroups(),
    ExerciseService.getEquipmentTypes()
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Exercise Library</h1>
        <p className="text-muted-foreground">
          Browse {exercises.length}+ exercises with detailed instructions
        </p>
      </div>

      <ExercisesLibraryClient
        initialExercises={exercises}
        muscles={muscles}
        equipment={equipment}
      />
    </div>
  );
}
```

**Deliverables Week 4:**
- ✅ Workout dashboard with stats
- ✅ Exercise library with search and filters
- ✅ Active session indicator
- ✅ Recent workouts list
- ✅ Responsive design matching existing patterns

---

## Phase 2: Advanced Features (Weeks 5-8)

### Week 5: Active Workout Session UI

This week focuses on the core workout logging interface - the most critical user experience.

#### Active Workout Session Component
```typescript
// File: app/workouts/session/[id]/workout-session-client.tsx

'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Trash2, Check, Clock, Timer } from 'lucide-react';
import { addWorkoutSetAction, deleteWorkoutSetAction, completeWorkoutSessionAction } from '@/app/actions/workouts';
import type { WorkoutSession, WorkoutExercise } from '@/lib/types/workout';

interface WorkoutSessionClientProps {
  initialSession: WorkoutSession;
  exercises: WorkoutExercise[];
}

export function WorkoutSessionClient({ initialSession, exercises }: WorkoutSessionClientProps) {
  const [session, setSession] = useState(initialSession);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [selectedExercise, setSelectedExercise] = useState<WorkoutExercise | null>(null);
  const [newSet, setNewSet] = useState({ reps: '', weight: '', rpe: '' });
  const [loading, setLoading] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [rating, setRating] = useState(0);

  // Timer for elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      const started = new Date(session.started_at).getTime();
      const now = new Date().getTime();
      setElapsedTime(Math.floor((now - started) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [session.started_at]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAddSet = async () => {
    if (!selectedExercise || !newSet.reps || !newSet.weight) return;

    setLoading(true);
    try {
      // Get the last set number for this exercise
      const exerciseSets = session.sets?.filter(s => s.exercise_id === selectedExercise.id) || [];
      const lastSetNumber = exerciseSets.length > 0
        ? Math.max(...exerciseSets.map(s => s.set_number))
        : 0;

      const set = await addWorkoutSetAction({
        session_id: session.id,
        exercise_id: selectedExercise.id,
        exercise_order: session.sets?.length || 0,
        set_number: lastSetNumber + 1,
        reps: parseInt(newSet.reps),
        weight_kg: parseFloat(newSet.weight),
        rpe: newSet.rpe ? parseInt(newSet.rpe) : undefined
      });

      // Optimistic update
      setSession(prev => ({
        ...prev,
        sets: [...(prev.sets || []), { ...set, exercise: selectedExercise }],
        total_sets: prev.total_sets + 1,
        total_reps: prev.total_reps + parseInt(newSet.reps),
        total_volume_kg: prev.total_volume_kg + (parseInt(newSet.reps) * parseFloat(newSet.weight))
      }));

      // Reset form
      setNewSet({ reps: '', weight: '', rpe: '' });
    } catch (error) {
      console.error('Error adding set:', error);
      alert('Failed to add set');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSet = async (setId: number) => {
    setLoading(true);
    try {
      await deleteWorkoutSetAction(setId);

      // Remove from local state
      setSession(prev => ({
        ...prev,
        sets: prev.sets?.filter(s => s.id !== setId)
      }));
    } catch (error) {
      console.error('Error deleting set:', error);
      alert('Failed to delete set');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteWorkout = async () => {
    setLoading(true);
    try {
      await completeWorkoutSessionAction({
        session_id: session.id,
        rating: rating || undefined
      });

      // Redirect to workout history
      window.location.href = '/workouts/history';
    } catch (error) {
      console.error('Error completing workout:', error);
      alert('Failed to complete workout');
    } finally {
      setLoading(false);
      setShowCompleteDialog(false);
    }
  };

  // Group sets by exercise
  const exerciseGroups = React.useMemo(() => {
    const groups = new Map<number, typeof session.sets>();

    session.sets?.forEach(set => {
      if (!groups.has(set.exercise_id)) {
        groups.set(set.exercise_id, []);
      }
      groups.get(set.exercise_id)!.push(set);
    });

    return Array.from(groups.entries()).map(([exercise_id, sets]) => ({
      exercise_id,
      exercise_name: sets[0]?.exercise?.name || 'Unknown',
      sets: sets.sort((a, b) => a.set_number - b.set_number)
    }));
  }, [session.sets]);

  return (
    <div className="space-y-6">
      {/* Header with Timer */}
      <Card className="border-primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Clock className="w-6 h-6" />
                Active Workout
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {session.title || session.routine?.name || 'Free Workout'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold font-mono">{formatTime(elapsedTime)}</div>
              <p className="text-xs text-muted-foreground">Elapsed Time</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{session.total_sets}</div>
              <div className="text-xs text-muted-foreground">Sets</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{(session.total_volume_kg / 1000).toFixed(1)}t</div>
              <div className="text-xs text-muted-foreground">Volume</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{session.total_exercises}</div>
              <div className="text-xs text-muted-foreground">Exercises</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exercise Sets */}
      {exerciseGroups.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Exercises</h3>
          {exerciseGroups.map((group) => (
            <Card key={group.exercise_id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{group.exercise_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {group.sets.map((set, index) => (
                    <div
                      key={set.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Badge variant="outline">Set {set.set_number}</Badge>
                        <div className="text-sm">
                          <span className="font-medium">{set.reps}</span> reps ×{' '}
                          <span className="font-medium">{set.weight_kg}</span> kg
                          {set.rpe && (
                            <span className="text-muted-foreground ml-2">
                              RPE {set.rpe}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSet(set.id)}
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Exercise / Add Set */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Set</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Exercise Selection */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                {selectedExercise ? selectedExercise.name : 'Select Exercise'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Select Exercise</DialogTitle>
                <DialogDescription>Choose an exercise to add sets</DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                {exercises.map((exercise) => (
                  <Button
                    key={exercise.id}
                    variant="outline"
                    className="justify-start h-auto py-3"
                    onClick={() => setSelectedExercise(exercise)}
                  >
                    <div className="text-left">
                      <div className="font-medium">{exercise.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {exercise.primary_muscles?.join(', ')}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          {/* Set Input */}
          {selectedExercise && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Reps</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newSet.reps}
                  onChange={(e) => setNewSet(prev => ({ ...prev, reps: e.target.value }))}
                  min="0"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Weight (kg)</label>
                <Input
                  type="number"
                  placeholder="0"
                  step="0.5"
                  value={newSet.weight}
                  onChange={(e) => setNewSet(prev => ({ ...prev, weight: e.target.value }))}
                  min="0"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">RPE (optional)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newSet.rpe}
                  onChange={(e) => setNewSet(prev => ({ ...prev, rpe: e.target.value }))}
                  min="1"
                  max="10"
                />
              </div>
            </div>
          )}

          <Button
            onClick={handleAddSet}
            disabled={loading || !selectedExercise || !newSet.reps || !newSet.weight}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Set
          </Button>
        </CardContent>
      </Card>

      {/* Complete Workout Button */}
      <Button
        onClick={() => setShowCompleteDialog(true)}
        disabled={loading || (session.sets?.length || 0) === 0}
        size="lg"
        className="w-full"
      >
        <Check className="w-4 h-4 mr-2" />
        Complete Workout
      </Button>

      {/* Complete Workout Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Workout?</AlertDialogTitle>
            <AlertDialogDescription>
              You completed {session.total_sets} sets with {(session.total_volume_kg / 1000).toFixed(1)}t total volume.
              How would you rate this workout?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-center gap-2 py-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={`text-3xl transition-colors ${
                  rating >= star ? 'text-yellow-400' : 'text-gray-300'
                }`}
              >
                ★
              </button>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCompleteWorkout} disabled={loading}>
              {loading ? 'Completing...' : 'Complete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

```typescript
// File: app/workouts/session/[id]/page.tsx

import { WorkoutSessionClient } from './workout-session-client';
import { getWorkoutSessionAction } from '@/app/actions/workouts';
import { ExerciseService } from '@/lib/services/exercise.service';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function WorkoutSessionPage({
  params
}: {
  params: { id: string }
}) {
  const sessionId = parseInt(params.id);
  const [session, exercises] = await Promise.all([
    getWorkoutSessionAction(sessionId),
    ExerciseService.getExercises({})
  ]);

  if (!session) {
    notFound();
  }

  return (
    <div className="container max-w-4xl mx-auto py-6">
      <WorkoutSessionClient
        initialSession={session}
        exercises={exercises}
      />
    </div>
  );
}
```

**Deliverables Week 5:**
- ✅ Active workout session interface
- ✅ Real-time elapsed timer
- ✅ Add/delete sets with optimistic updates
- ✅ Exercise selection dialog
- ✅ Session completion flow with rating
- ✅ Live volume/sets/exercises calculations

---

### Week 6: Analytics & Progress Tracking

[Content continues in next response due to length...]

**Deliverables Week 6:**
- ✅ Exercise progress charts (volume, weight, reps over time)
- ✅ Personal records display
- ✅ Body measurements tracking
- ✅ Progress photos upload
- ✅ Muscle group heatmap
- ✅ Weekly/monthly statistics

---

### Week 7: Routine Builder

**Deliverables Week 7:**
- ✅ Create/edit workout routines
- ✅ Drag-and-drop exercise ordering
- ✅ Routine templates
- ✅ Folder organization
- ✅ Start workout from routine
- ✅ Routine sharing/export

---

### Week 8: Caching & Performance Optimization

**Add Redis caching:**
```bash
npm install ioredis
npm install -D @types/ioredis
```

**Deliverables Week 8:**
- ✅ Redis setup for session caching
- ✅ Query result caching (exercise library, stats)
- ✅ Cache invalidation strategies
- ✅ Database query optimization
- ✅ Index analysis and improvements
- ✅ Load testing (target: <200ms p95)

---

## Phase 3: Integration & PWA (Weeks 9-12)

### Week 9-10: PWA Setup

**Deliverables Weeks 9-10:**
- ✅ Service Worker implementation
- ✅ Offline mode with IndexedDB
- ✅ App manifest configuration
- ✅ Install prompts
- ✅ Background sync for sets
- ✅ Push notifications for rest timer
- ✅ Cache-first strategies for assets

---

### Week 11: Advanced Features

**Deliverables Week 11:**
- ✅ Rest timer with notifications
- ✅ Plate calculator
- ✅ Workout timer with intervals
- ✅ 1RM calculator
- ✅ Notes and form videos
- ✅ Workout templates marketplace

---

### Week 12: Testing, Polish & Launch

**Deliverables Week 12:**
- ✅ E2E testing with Playwright
- ✅ Unit tests for services
- ✅ Performance audit
- ✅ Security audit
- ✅ Documentation
- ✅ Production deployment
- ✅ Monitoring setup

---

## File Structure

```
full_tracker/
├── app/
│   ├── workouts/
│   │   ├── page.tsx                          # Main dashboard
│   │   ├── session/
│   │   │   ├── new/
│   │   │   │   └── page.tsx                  # Start new workout
│   │   │   └── [id]/
│   │   │       ├── page.tsx                  # Active workout session (server)
│   │   │       └── workout-session-client.tsx # Active workout (client)
│   │   ├── history/
│   │   │   └── page.tsx                      # Workout history
│   │   ├── exercises/
│   │   │   ├── page.tsx                      # Exercise library (server)
│   │   │   ├── exercises-library-client.tsx  # Exercise library (client)
│   │   │   └── [id]/
│   │   │       └── page.tsx                  # Exercise detail with history
│   │   ├── routines/
│   │   │   ├── page.tsx                      # Routine list
│   │   │   ├── new/
│   │   │   │   └── page.tsx                  # Create routine
│   │   │   └── [id]/
│   │   │       ├── page.tsx                  # Routine detail
│   │   │       └── edit/
│   │   │           └── page.tsx              # Edit routine
│   │   ├── analytics/
│   │   │   └── page.tsx                      # Analytics dashboard
│   │   └── measurements/
│   │       └── page.tsx                      # Body measurements
│   ├── actions/
│   │   └── workouts.ts                       # Server actions
│   └── api/
│       ├── workouts/
│       │   ├── route.ts                      # GET/POST workouts
│       │   └── [id]/
│       │       ├── route.ts                  # GET/PATCH workout
│       │       └── sets/
│       │           └── route.ts              # POST/DELETE sets
│       └── exercises/
│           └── route.ts                      # GET exercises
├── lib/
│   ├── services/
│   │   ├── workout.service.ts                # Workout operations
│   │   ├── exercise.service.ts               # Exercise operations
│   │   └── routine.service.ts                # Routine operations
│   ├── types/
│   │   └── workout.ts                        # TypeScript types
│   ├── hooks/
│   │   ├── useWorkoutSession.ts              # Active session hook
│   │   ├── useRestTimer.ts                   # Rest timer hook
│   │   └── useOfflineSync.ts                 # Offline sync hook
│   ├── cache.ts                              # Redis cache service
│   └── db.ts                                 # Database connection
├── components/
│   └── ui/
│       ├── workout-set-card.tsx              # Set display component
│       ├── exercise-picker.tsx               # Exercise selection
│       ├── rest-timer.tsx                    # Rest timer component
│       └── progress-chart.tsx                # Progress visualization
├── db/
│   └── migrations/
│       ├── 031_create_exercise_library.sql
│       ├── 032_create_workout_sessions.sql
│       ├── 033_create_workout_routines.sql
│       └── 034_create_personal_records.sql
└── public/
    ├── manifest.json                         # PWA manifest
    ├── service-worker.js                     # Service worker
    └── icons/                                # App icons
```

---

## Testing Strategy

### Unit Tests
```typescript
// __tests__/services/workout.service.test.ts
import { WorkoutService } from '@/lib/services/workout.service';
import { db } from '@/lib/db';

describe('WorkoutService', () => {
  beforeEach(async () => {
    await db.query('TRUNCATE workout_sessions CASCADE');
  });

  it('should create workout session', async () => {
    const session = await WorkoutService.createSession({});
    expect(session.id).toBeDefined();
    expect(session.started_at).toBeDefined();
  });

  it('should calculate session totals correctly', async () => {
    const session = await WorkoutService.createSession({});

    await WorkoutService.addSet({
      session_id: session.id,
      exercise_id: 1,
      exercise_order: 0,
      set_number: 1,
      reps: 10,
      weight_kg: 100
    });

    const updated = await WorkoutService.getSession(session.id);
    expect(updated?.total_volume_kg).toBe(1000);
    expect(updated?.total_reps).toBe(10);
    expect(updated?.total_sets).toBe(1);
  });

  it('should detect personal records', async () => {
    // Test PR detection logic
  });
});
```

### Integration Tests
```typescript
// __tests__/api/workouts.test.ts
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/workouts/route';

describe('POST /api/workouts', () => {
  it('should create workout session via API', async () => {
    const request = new NextRequest('http://localhost:3000/api/workouts', {
      method: 'POST',
      body: JSON.stringify({})
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.id).toBeDefined();
  });
});
```

### E2E Tests
```typescript
// e2e/workout-flow.spec.ts
import { test, expect } from '@playwright/test';

test('complete workout flow', async ({ page }) => {
  // Start workout
  await page.goto('/workouts');
  await page.click('text=Start Workout');

  // Add exercise
  await page.click('text=Select Exercise');
  await page.click('text=Barbell Bench Press');

  // Add sets
  await page.fill('input[placeholder="0"]', '10');  // reps
  await page.fill('input[step="0.5"]', '100');      // weight
  await page.click('text=Add Set');

  // Verify set added
  await expect(page.locator('text=Set 1')).toBeVisible();
  await expect(page.locator('text=10 reps × 100 kg')).toBeVisible();

  // Complete workout
  await page.click('text=Complete Workout');
  await page.click('text=Complete', { timeout: 1000 });

  // Verify redirect to history
  await expect(page).toHaveURL(/\/workouts\/history/);
});
```

---

## Performance Considerations

### Database Optimization
1. **Indexes:** Already defined in migrations for common queries
2. **Connection Pooling:** Existing 20-connection pool
3. **Query Optimization:** Use JOINs instead of N+1 queries
4. **Materialized Views:** Consider for complex analytics (Week 6)

### Caching Strategy
```typescript
// Cache Layers:
// 1. Redis: Session data, stats, exercise library (5-60 min TTL)
// 2. Next.js: Static pages cached at build time
// 3. Browser: Service Worker for offline support
// 4. IndexedDB: Offline workout data

// Cache Invalidation:
// - On workout completion: Clear session cache
// - On set add/delete: Clear session + stats cache
// - On exercise create: Clear exercise library cache
```

### Frontend Optimization
1. **Code Splitting:** Dynamic imports for heavy components
2. **Image Optimization:** Next.js Image component for exercise thumbnails
3. **Lazy Loading:** Virtualize long exercise lists
4. **Debouncing:** Search input with 300ms delay
5. **Optimistic Updates:** Immediate UI feedback before server confirmation

---

## Deployment Guide

### Environment Variables
```env
# .env.local
DATABASE_URL=postgresql://user:password@localhost:5432/full_tracker
REDIS_URL=redis://localhost:6379
NODE_ENV=development

# Railway Production
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
NODE_ENV=production
```

### Railway Deployment
```toml
# railway.toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm run start"
healthcheckPath = "/api/health"
healthcheckTimeout = 30
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3

[[services]]
name = "web"
instances = 1
```

### Database Migration on Deploy
```bash
# Add to start.sh or nixpacks build
#!/bin/bash
echo "Running database migrations..."
bash db/run-migrations.sh

echo "Starting application..."
npm run start
```

### Monitoring
```typescript
// lib/monitoring.ts
export function logQuery(query: string, duration: number) {
  if (duration > 100) {
    console.warn(`Slow query (${duration}ms):`, query);
  }
}

export function logError(error: Error, context: any) {
  console.error('Application error:', {
    message: error.message,
    stack: error.stack,
    context
  });

  // Send to error tracking service (Sentry, etc.)
}
```

---

## Migration from Current Structure

### Integrating with Existing Dashboard

Update the main dashboard to include fitness tracking:

```typescript
// File: app/page.tsx (add to existing)

// Import workout actions
import { getWorkoutStatsAction, getActiveWorkoutSessionAction } from '@/app/actions/workouts';

// In the component:
const [workoutStats, activeWorkout] = await Promise.all([
  getWorkoutStatsAction(30),
  getActiveWorkoutSessionAction(),
  // ... existing data fetches
]);

// Add to dashboard stats grid:
<Link href="/workouts" className="block">
  <Card className="cursor-pointer hover:bg-muted/50 transition-colors h-full">
    <CardHeader className="pb-2">
      <CardTitle className="flex items-center gap-2 text-lg">
        <Dumbbell className="w-4 h-4" />
        {workoutStats?.total_completed_sessions || 0}
      </CardTitle>
      <CardDescription className="text-xs">Workouts This Month</CardDescription>
    </CardHeader>
  </Card>
</Link>

// Add active workout indicator if present
{activeWorkout && (
  <Card className="border-primary">
    <CardHeader>
      <CardTitle className="text-base flex items-center gap-2">
        <Clock className="w-4 h-4 animate-pulse" />
        Active Workout
      </CardTitle>
      <CardDescription>Continue your workout</CardDescription>
    </CardHeader>
    <CardContent>
      <Button asChild>
        <Link href={`/workouts/session/${activeWorkout.id}`}>
          Continue Workout
        </Link>
      </Button>
    </CardContent>
  </Card>
)}
```

### Navigation Update
```typescript
// File: components/navigation.tsx (add to existing)

const navItems = [
  // ... existing items
  {
    title: 'Workouts',
    href: '/workouts',
    icon: Dumbbell
  }
];
```

---

## Key Metrics to Track

### Development Metrics
- **Lines of Code:** Target <5000 LOC for Phase 1
- **Test Coverage:** Target >70%
- **Build Time:** Target <30 seconds
- **Bundle Size:** Target <500KB initial load

### Performance Metrics
- **API Response Time:** Target <200ms p95
- **Database Query Time:** Target <50ms p95
- **Cache Hit Rate:** Target >70%
- **Time to Interactive:** Target <2 seconds

### User Metrics
- **Workout Completion Rate:** Track sessions started vs completed
- **Daily Active Users:** Track unique workout sessions per day
- **Session Duration:** Average workout length
- **User Retention:** 7-day, 30-day retention rates

---

## Conclusion

This roadmap provides a complete path to implement Hevy-style fitness tracking in your existing full_tracker application. The phased approach ensures:

1. **Week 1-4:** Core tracking functionality (MVP)
2. **Week 5-8:** Advanced features and optimization
3. **Week 9-12:** PWA capabilities and polish

**Critical Success Factors:**
- Maintain consistency with existing UI patterns
- Leverage established architecture (Server Actions, db service, migration system)
- Progressive enhancement (start simple, add complexity)
- Mobile-first design for gym use
- Offline support for poor connectivity environments

**Next Steps:**
1. Review and approve roadmap
2. Run Week 1 database migrations
3. Begin implementation following week-by-week plan
4. Iterate based on testing and feedback

This implementation will seamlessly integrate with your existing tracking systems while providing professional-grade fitness tracking capabilities.
