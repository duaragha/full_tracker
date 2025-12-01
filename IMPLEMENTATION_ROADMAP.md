# Implementation Roadmap: Applying Hevy's Architecture to Full Tracker

## Current State Analysis

Based on your existing codebase:

**Current Stack:**
- Next.js 16 (Frontend + API Routes)
- PostgreSQL (via @vercel/postgres)
- Vercel/Railway deployment
- No caching layer yet
- No background job system
- Basic CRUD operations

**Existing Strengths:**
- Clean PostgreSQL schema with migrations
- Proper indexing on status fields
- Connection pooling (20 connections)
- TypeScript throughout

## Phase 1: Foundation (Weeks 1-2)

### 1.1 Enhanced Database Layer

**Add Workout Tracking Tables:**

```sql
-- File: db/migrations/031_create_workout_system.sql

-- Core workout tables following Hevy's design
CREATE TABLE workout_exercises (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  equipment TEXT[],
  primary_muscles TEXT[],
  secondary_muscles TEXT[],
  video_url TEXT,
  thumbnail_url TEXT,
  is_custom BOOLEAN DEFAULT false,
  created_by INTEGER,  -- NULL for system exercises
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workout_routines (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_template BOOLEAN DEFAULT false,
  folder TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE routine_exercises (
  id SERIAL PRIMARY KEY,
  routine_id INTEGER REFERENCES workout_routines(id) ON DELETE CASCADE,
  exercise_id INTEGER REFERENCES workout_exercises(id),
  exercise_order INTEGER NOT NULL,
  target_sets INTEGER,
  target_reps INTEGER,
  target_weight_kg DECIMAL,
  rest_seconds INTEGER DEFAULT 90,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workout_sessions (
  id SERIAL PRIMARY KEY,
  routine_id INTEGER REFERENCES workout_routines(id),
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  total_volume_kg DECIMAL DEFAULT 0,
  total_sets INTEGER DEFAULT 0,
  total_exercises INTEGER DEFAULT 0,
  notes TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workout_sets (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id INTEGER REFERENCES workout_exercises(id),
  set_number INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight_kg DECIMAL NOT NULL,
  rpe INTEGER CHECK (rpe BETWEEN 1 AND 10),
  is_warmup BOOLEAN DEFAULT false,
  is_failure BOOLEAN DEFAULT false,
  rest_seconds INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE personal_records (
  id SERIAL PRIMARY KEY,
  exercise_id INTEGER REFERENCES workout_exercises(id),
  record_type TEXT CHECK (record_type IN ('1rm', '3rm', '5rm', 'volume', 'reps')),
  value DECIMAL NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL,
  session_id INTEGER REFERENCES workout_sessions(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exercise_id, record_type)
);

-- Critical indexes for performance
CREATE INDEX idx_workout_sessions_started ON workout_sessions(started_at DESC);
CREATE INDEX idx_workout_sessions_completed ON workout_sessions(completed_at DESC) WHERE completed_at IS NOT NULL;
CREATE INDEX idx_workout_sets_session ON workout_sets(session_id);
CREATE INDEX idx_workout_sets_exercise ON workout_sets(exercise_id, created_at DESC);
CREATE INDEX idx_routine_exercises_routine ON routine_exercises(routine_id, exercise_order);
CREATE INDEX idx_personal_records_exercise ON personal_records(exercise_id, record_type);

-- GIN index for muscle group searches
CREATE INDEX idx_exercises_muscles ON workout_exercises USING GIN(primary_muscles);

-- Partial index for active sessions
CREATE INDEX idx_active_sessions ON workout_sessions(started_at DESC) WHERE completed_at IS NULL;
```

### 1.2 TypeScript Types

```typescript
// File: lib/types/workout.ts

export interface WorkoutExercise {
  id: number;
  name: string;
  description?: string;
  equipment?: string[];
  primary_muscles?: string[];
  secondary_muscles?: string[];
  video_url?: string;
  thumbnail_url?: string;
  is_custom: boolean;
  created_by?: number;
  created_at: Date;
  updated_at: Date;
}

export interface WorkoutRoutine {
  id: number;
  name: string;
  description?: string;
  is_template: boolean;
  folder?: string;
  exercises?: RoutineExercise[];
  created_at: Date;
  updated_at: Date;
}

export interface RoutineExercise {
  id: number;
  routine_id: number;
  exercise_id: number;
  exercise_order: number;
  target_sets?: number;
  target_reps?: number;
  target_weight_kg?: number;
  rest_seconds: number;
  notes?: string;
  exercise?: WorkoutExercise;
}

export interface WorkoutSession {
  id: number;
  routine_id?: number;
  started_at: Date;
  completed_at?: Date;
  duration_seconds?: number;
  total_volume_kg: number;
  total_sets: number;
  total_exercises: number;
  notes?: string;
  rating?: number;
  sets?: WorkoutSet[];
  routine?: WorkoutRoutine;
  created_at: Date;
  updated_at: Date;
}

export interface WorkoutSet {
  id: number;
  session_id: number;
  exercise_id: number;
  set_number: number;
  reps: number;
  weight_kg: number;
  rpe?: number;
  is_warmup: boolean;
  is_failure: boolean;
  rest_seconds?: number;
  notes?: string;
  exercise?: WorkoutExercise;
  created_at: Date;
}

export interface PersonalRecord {
  id: number;
  exercise_id: number;
  record_type: '1rm' | '3rm' | '5rm' | 'volume' | 'reps';
  value: number;
  achieved_at: Date;
  session_id?: number;
  exercise?: WorkoutExercise;
  created_at: Date;
}

export interface WorkoutStats {
  total_sessions: number;
  total_volume_kg: number;
  total_sets: number;
  total_reps: number;
  avg_session_duration_minutes: number;
  workout_days: number;
  current_streak: number;
  longest_streak: number;
}
```

### 1.3 Database Service Layer

```typescript
// File: lib/services/workout.service.ts

import { db } from '@/lib/db';
import type { WorkoutSession, WorkoutSet, PersonalRecord } from '@/lib/types/workout';

export class WorkoutService {
  // Create new workout session
  static async createSession(data: {
    routine_id?: number;
    started_at: Date;
  }): Promise<WorkoutSession> {
    const result = await db.query(`
      INSERT INTO workout_sessions (routine_id, started_at)
      VALUES ($1, $2)
      RETURNING *
    `, [data.routine_id, data.started_at]);

    return result.rows[0];
  }

  // Add set to workout
  static async addSet(data: {
    session_id: number;
    exercise_id: number;
    set_number: number;
    reps: number;
    weight_kg: number;
    rpe?: number;
    is_warmup?: boolean;
    is_failure?: boolean;
  }): Promise<WorkoutSet> {
    const result = await db.query(`
      INSERT INTO workout_sets (
        session_id, exercise_id, set_number,
        reps, weight_kg, rpe, is_warmup, is_failure
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      data.session_id,
      data.exercise_id,
      data.set_number,
      data.reps,
      data.weight_kg,
      data.rpe || null,
      data.is_warmup || false,
      data.is_failure || false
    ]);

    // Recalculate session totals
    await this.updateSessionTotals(data.session_id);

    return result.rows[0];
  }

  // Complete workout session
  static async completeSession(session_id: number, rating?: number): Promise<WorkoutSession> {
    const completed_at = new Date();

    // Calculate duration
    const session = await this.getSession(session_id);
    const duration_seconds = Math.floor(
      (completed_at.getTime() - new Date(session.started_at).getTime()) / 1000
    );

    const result = await db.query(`
      UPDATE workout_sessions
      SET completed_at = $1,
          duration_seconds = $2,
          rating = $3,
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [completed_at, duration_seconds, rating || null, session_id]);

    // Check for personal records
    await this.checkPersonalRecords(session_id);

    return result.rows[0];
  }

  // Update session totals (called after each set)
  private static async updateSessionTotals(session_id: number): Promise<void> {
    await db.query(`
      UPDATE workout_sessions
      SET
        total_volume_kg = (
          SELECT COALESCE(SUM(reps * weight_kg), 0)
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

  // Get workout session with sets
  static async getSession(session_id: number): Promise<WorkoutSession> {
    const sessionResult = await db.query(`
      SELECT ws.*, wr.name as routine_name
      FROM workout_sessions ws
      LEFT JOIN workout_routines wr ON ws.routine_id = wr.id
      WHERE ws.id = $1
    `, [session_id]);

    const setsResult = await db.query(`
      SELECT s.*, e.name as exercise_name, e.primary_muscles
      FROM workout_sets s
      JOIN workout_exercises e ON s.exercise_id = e.id
      WHERE s.session_id = $1
      ORDER BY s.set_number
    `, [session_id]);

    return {
      ...sessionResult.rows[0],
      sets: setsResult.rows
    };
  }

  // Check for personal records
  private static async checkPersonalRecords(session_id: number): Promise<void> {
    // Get all sets from this session
    const sets = await db.query(`
      SELECT exercise_id, reps, weight_kg
      FROM workout_sets
      WHERE session_id = $1 AND is_warmup = false
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

  // Update personal records for an exercise
  private static async updatePersonalRecords(
    exercise_id: number,
    sets: Array<{ reps: number; weight_kg: number }>,
    session_id: number
  ): Promise<void> {
    // Calculate estimated 1RM for each set
    const estimated1RMs = sets.map(set => {
      if (set.reps === 1) return set.weight_kg;
      // Brzycki formula
      return set.weight_kg * (36 / (37 - set.reps));
    });

    const max1RM = Math.max(...estimated1RMs);

    // Update 1RM PR if better
    await db.query(`
      INSERT INTO personal_records (exercise_id, record_type, value, achieved_at, session_id)
      VALUES ($1, '1rm', $2, NOW(), $3)
      ON CONFLICT (exercise_id, record_type)
      DO UPDATE SET
        value = EXCLUDED.value,
        achieved_at = EXCLUDED.achieved_at,
        session_id = EXCLUDED.session_id
      WHERE EXCLUDED.value > personal_records.value
    `, [exercise_id, max1RM, session_id]);

    // Check for rep PRs at different weights
    // ... similar logic for 3rm, 5rm, volume PRs
  }

  // Get workout statistics
  static async getStats(days: number = 30): Promise<any> {
    const result = await db.query(`
      SELECT
        COUNT(*) as total_sessions,
        COALESCE(SUM(total_volume_kg), 0) as total_volume_kg,
        COALESCE(SUM(total_sets), 0) as total_sets,
        COALESCE(AVG(duration_seconds) / 60, 0) as avg_duration_minutes,
        COUNT(DISTINCT DATE(started_at)) as workout_days
      FROM workout_sessions
      WHERE completed_at IS NOT NULL
        AND completed_at > NOW() - INTERVAL '1 day' * $1
    `, [days]);

    return result.rows[0];
  }

  // Get exercise volume over time
  static async getExerciseVolume(exercise_id: number, days: number = 90): Promise<any[]> {
    const result = await db.query(`
      SELECT
        DATE(ws.completed_at) as date,
        SUM(s.reps * s.weight_kg) as volume_kg,
        COUNT(*) as total_sets,
        AVG(s.weight_kg) as avg_weight
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
}
```

## Phase 2: API Layer (Weeks 3-4)

### 2.1 API Routes

```typescript
// File: app/api/workouts/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { WorkoutService } from '@/lib/services/workout.service';
import { z } from 'zod';

const createSessionSchema = z.object({
  routine_id: z.number().optional(),
  started_at: z.string().datetime()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createSessionSchema.parse(body);

    const session = await WorkoutService.createSession({
      routine_id: validated.routine_id,
      started_at: new Date(validated.started_at)
    });

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating session:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');

    const stats = await WorkoutService.getStats(days);

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
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
import { z } from 'zod';

const addSetSchema = z.object({
  exercise_id: z.number(),
  set_number: z.number().min(1),
  reps: z.number().min(0).max(1000),
  weight_kg: z.number().min(0).max(1000),
  rpe: z.number().min(1).max(10).optional(),
  is_warmup: z.boolean().optional(),
  is_failure: z.boolean().optional()
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session_id = parseInt(params.id);
    const body = await req.json();
    const validated = addSetSchema.parse(body);

    const set = await WorkoutService.addSet({
      session_id,
      ...validated
    });

    return NextResponse.json({ success: true, data: set });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors },
        { status: 400 }
      );
    }

    console.error('Error adding set:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Phase 3: Caching Layer (Week 5)

### 3.1 Add Redis Support

```bash
npm install ioredis
npm install -D @types/ioredis
```

```typescript
// File: lib/cache.ts

import Redis from 'ioredis';

// Create Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  showFriendlyErrorStack: process.env.NODE_ENV !== 'production'
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

export class CacheService {
  private static TTL = {
    SHORT: 60 * 5,        // 5 minutes
    MEDIUM: 60 * 60,      // 1 hour
    LONG: 60 * 60 * 24    // 24 hours
  };

  // Generic cache-aside pattern
  static async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  static async set(key: string, value: any, ttl: number = this.TTL.MEDIUM): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  static async del(keys: string | string[]): Promise<void> {
    try {
      if (Array.isArray(keys)) {
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } else {
        await redis.del(keys);
      }
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  // Cache keys
  static keys = {
    workoutSession: (id: number) => `workout:session:${id}`,
    workoutStats: (days: number) => `workout:stats:${days}d`,
    exerciseVolume: (exerciseId: number, days: number) => `exercise:${exerciseId}:volume:${days}d`,
    personalRecords: (exerciseId: number) => `pr:exercise:${exerciseId}`
  };
}

export default redis;
```

### 3.2 Update Service with Caching

```typescript
// File: lib/services/workout.service.ts (updated)

import { CacheService } from '@/lib/cache';

export class WorkoutService {
  // Get session with caching
  static async getSession(session_id: number): Promise<WorkoutSession> {
    const cacheKey = CacheService.keys.workoutSession(session_id);

    // Try cache first
    const cached = await CacheService.get<WorkoutSession>(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const session = await this.fetchSessionFromDB(session_id);

    // Cache for 5 minutes
    await CacheService.set(cacheKey, session, 60 * 5);

    return session;
  }

  // Invalidate cache after updates
  static async addSet(data: any): Promise<WorkoutSet> {
    const set = await this.addSetToDB(data);

    // Invalidate session cache
    await CacheService.del([
      CacheService.keys.workoutSession(data.session_id),
      CacheService.keys.workoutStats(30),
      CacheService.keys.exerciseVolume(data.exercise_id, 90)
    ]);

    return set;
  }
}
```

## Phase 4: Background Jobs (Week 6)

### 4.1 Add Bull for Job Queue

```bash
npm install bull
npm install -D @types/bull
```

```typescript
// File: lib/queue.ts

import Queue from 'bull';

const redisConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  }
};

// Job queues
export const queues = {
  analytics: new Queue('analytics', redisConfig),
  notifications: new Queue('notifications', redisConfig)
};

// Job processors
queues.analytics.process('calculate-prs', async (job) => {
  const { session_id } = job.data;
  console.log(`Processing PRs for session ${session_id}`);

  // Calculate personal records
  await WorkoutService.checkPersonalRecords(session_id);
});

queues.analytics.process('update-stats', async (job) => {
  const { user_id } = job.data;
  console.log(`Updating stats for user ${user_id}`);

  // Refresh materialized views or cache
  // ... implementation
});

// Add job to queue
export async function queuePRCalculation(session_id: number) {
  await queues.analytics.add('calculate-prs', { session_id }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }
  });
}
```

## Phase 5: Advanced Features (Weeks 7-8)

### 5.1 Real-time Updates During Workout

```typescript
// File: lib/hooks/useWorkoutSession.ts

'use client';

import { useState, useEffect } from 'react';
import { WorkoutSession, WorkoutSet } from '@/lib/types/workout';

export function useWorkoutSession(sessionId: number) {
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(false);

  // Optimistic UI update
  const addSet = async (setData: Omit<WorkoutSet, 'id' | 'created_at'>) => {
    // Add to UI immediately
    const optimisticSet = {
      ...setData,
      id: Date.now(), // Temporary ID
      created_at: new Date(),
      _pending: true
    };

    setSession(prev => ({
      ...prev!,
      sets: [...(prev?.sets || []), optimisticSet]
    }));

    try {
      // Send to server
      const response = await fetch(`/api/workouts/${sessionId}/sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setData)
      });

      const { data } = await response.json();

      // Replace optimistic set with real data
      setSession(prev => ({
        ...prev!,
        sets: prev!.sets!.map(s =>
          s.id === optimisticSet.id ? data : s
        )
      }));
    } catch (error) {
      // Revert on error
      setSession(prev => ({
        ...prev!,
        sets: prev!.sets!.filter(s => s.id !== optimisticSet.id)
      }));
      throw error;
    }
  };

  return {
    session,
    loading,
    addSet
  };
}
```

### 5.2 Analytics Dashboard

```typescript
// File: app/workouts/stats/page.tsx

import { WorkoutService } from '@/lib/services/workout.service';
import { Card } from '@/components/ui/card';

export default async function StatsPage() {
  const stats = await WorkoutService.getStats(30);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Workout Statistics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="text-sm text-gray-500">Total Workouts</div>
          <div className="text-3xl font-bold">{stats.total_sessions}</div>
        </Card>

        <Card className="p-6">
          <div className="text-sm text-gray-500">Total Volume</div>
          <div className="text-3xl font-bold">
            {(stats.total_volume_kg / 1000).toFixed(1)}t
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-sm text-gray-500">Total Sets</div>
          <div className="text-3xl font-bold">{stats.total_sets}</div>
        </Card>

        <Card className="p-6">
          <div className="text-sm text-gray-500">Avg Duration</div>
          <div className="text-3xl font-bold">
            {Math.round(stats.avg_duration_minutes)}m
          </div>
        </Card>
      </div>
    </div>
  );
}
```

## Deployment Considerations

### Environment Variables

```env
# .env.local
DATABASE_URL=postgresql://user:pass@localhost:5432/full_tracker
REDIS_URL=redis://localhost:6379

# Production (Railway/Vercel)
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

### Railway Deployment

```yaml
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
name = "api"
instances = 2  # Scale horizontally

[[services]]
name = "worker"
startCommand = "node dist/worker.js"
instances = 1
```

## Testing Strategy

```typescript
// File: __tests__/workout.service.test.ts

import { WorkoutService } from '@/lib/services/workout.service';
import { db } from '@/lib/db';

describe('WorkoutService', () => {
  beforeEach(async () => {
    // Clear test data
    await db.query('TRUNCATE workout_sessions CASCADE');
  });

  it('should create workout session', async () => {
    const session = await WorkoutService.createSession({
      started_at: new Date()
    });

    expect(session.id).toBeDefined();
    expect(session.started_at).toBeDefined();
  });

  it('should calculate volume correctly', async () => {
    const session = await WorkoutService.createSession({
      started_at: new Date()
    });

    await WorkoutService.addSet({
      session_id: session.id,
      exercise_id: 1,
      set_number: 1,
      reps: 10,
      weight_kg: 100
    });

    const updated = await WorkoutService.getSession(session.id);
    expect(updated.total_volume_kg).toBe(1000); // 10 reps * 100kg
  });
});
```

## Performance Monitoring

```typescript
// File: lib/monitoring.ts

import { performance } from 'perf_hooks';

export function measureQuery<T>(
  queryFn: () => Promise<T>,
  queryName: string
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const start = performance.now();

    try {
      const result = await queryFn();
      const duration = performance.now() - start;

      if (duration > 100) {
        console.warn(`Slow query: ${queryName} took ${duration.toFixed(2)}ms`);
      }

      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

// Usage
const stats = await measureQuery(
  () => WorkoutService.getStats(30),
  'getStats'
);
```

## Next Steps

1. **Week 1-2**: Implement database schema and basic CRUD
2. **Week 3-4**: Build API routes with validation
3. **Week 5**: Add Redis caching
4. **Week 6**: Implement background jobs
5. **Week 7-8**: Build frontend components
6. **Week 9**: Testing and optimization
7. **Week 10**: Deploy and monitor

## Key Metrics to Track

- API response time (target: < 200ms p95)
- Database query time (target: < 50ms p95)
- Cache hit rate (target: > 70%)
- Workout completion rate
- User engagement (sessions per week)

---

This roadmap provides a practical path to implement Hevy-inspired features while maintaining your current architecture and team velocity.
