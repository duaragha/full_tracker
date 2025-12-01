# Fitness API Implementation Guide

## Overview

This guide provides practical implementation details for transitioning from Next.js server actions to a full RESTful API architecture that supports web, Wear OS, and Health Connect integration.

## Database Schema

### Migration File

Create: `db/migrations/020_create_fitness_tables.sql`

```sql
-- ==================== EXERCISES ====================
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'strength', 'cardio', 'flexibility', 'balance',
    'plyometric', 'olympic_lifting', 'powerlifting',
    'bodyweight', 'functional'
  )),
  muscle_groups TEXT[] DEFAULT '{}',
  equipment TEXT[] DEFAULT '{}',
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  instructions TEXT[] DEFAULT '{}',
  video_url TEXT,
  thumbnail_url TEXT,
  is_custom BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for exercises
CREATE INDEX idx_exercises_category ON exercises(category);
CREATE INDEX idx_exercises_difficulty ON exercises(difficulty);
CREATE INDEX idx_exercises_is_custom ON exercises(is_custom);
CREATE INDEX idx_exercises_created_by ON exercises(created_by);
CREATE INDEX idx_exercises_muscle_groups ON exercises USING GIN(muscle_groups);
CREATE INDEX idx_exercises_equipment ON exercises USING GIN(equipment);
CREATE INDEX idx_exercises_name_search ON exercises USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- ==================== ROUTINES ====================
CREATE TABLE IF NOT EXISTS workout_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  estimated_duration_minutes INTEGER,
  schedule JSONB DEFAULT '{}',
  last_used_at TIMESTAMPTZ,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for routines
CREATE INDEX idx_routines_user_id ON workout_routines(user_id);
CREATE INDEX idx_routines_is_public ON workout_routines(is_public);
CREATE INDEX idx_routines_difficulty ON workout_routines(difficulty);
CREATE INDEX idx_routines_category ON workout_routines(category);

-- ==================== ROUTINE EXERCISES ====================
CREATE TABLE IF NOT EXISTS routine_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES workout_routines(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL, -- Denormalized for performance
  order_position INTEGER NOT NULL,
  target_sets INTEGER,
  target_reps INTEGER,
  target_weight DECIMAL(6,2),
  rest_seconds INTEGER,
  notes TEXT,
  superset_group TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for routine exercises
CREATE INDEX idx_routine_exercises_routine ON routine_exercises(routine_id, order_position);
CREATE INDEX idx_routine_exercises_exercise ON routine_exercises(exercise_id);

-- ==================== WORKOUTS ====================
CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  routine_id UUID REFERENCES workout_routines(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN (
    'planned', 'in_progress', 'completed', 'cancelled'
  )),
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  notes TEXT,
  location_type TEXT CHECK (location_type IN ('gym', 'home', 'outdoor')),
  location_name TEXT,

  -- Metrics (calculated)
  total_volume DECIMAL(10,2),
  total_reps INTEGER,
  total_sets INTEGER,
  calories_burned INTEGER,
  average_heart_rate INTEGER,
  max_heart_rate INTEGER,

  -- Sync metadata
  sync_source TEXT CHECK (sync_source IN ('web', 'wear_os', 'health_connect', 'ios')),
  device_id TEXT,
  synced_at TIMESTAMPTZ,
  client_id TEXT, -- Client-side identifier for offline sync
  version INTEGER DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, client_id)
);

-- Indexes for workouts
CREATE INDEX idx_workouts_user_id ON workouts(user_id);
CREATE INDEX idx_workouts_status ON workouts(status);
CREATE INDEX idx_workouts_started_at ON workouts(started_at DESC);
CREATE INDEX idx_workouts_routine_id ON workouts(routine_id);
CREATE INDEX idx_workouts_sync_source ON workouts(sync_source);
CREATE INDEX idx_workouts_device_id ON workouts(device_id) WHERE device_id IS NOT NULL;
CREATE INDEX idx_workouts_user_status_date ON workouts(user_id, status, started_at DESC);

-- ==================== WORKOUT EXERCISES ====================
CREATE TABLE IF NOT EXISTS workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL, -- Denormalized
  order_position INTEGER NOT NULL,
  notes TEXT,
  superset_group TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for workout exercises
CREATE INDEX idx_workout_exercises_workout ON workout_exercises(workout_id, order_position);
CREATE INDEX idx_workout_exercises_exercise ON workout_exercises(exercise_id);

-- ==================== SETS ====================
CREATE TABLE IF NOT EXISTS workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  set_type TEXT NOT NULL CHECK (set_type IN (
    'normal', 'warmup', 'drop_set', 'superset',
    'rest_pause', 'failure', 'amrap'
  )),

  -- Targets
  target_reps INTEGER,
  target_weight DECIMAL(6,2),
  target_duration_seconds INTEGER,
  target_distance_meters DECIMAL(8,2),

  -- Actuals
  actual_reps INTEGER,
  actual_weight DECIMAL(6,2),
  actual_duration_seconds INTEGER,
  actual_distance_meters DECIMAL(8,2),

  rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
  rest_seconds INTEGER,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for sets
CREATE INDEX idx_workout_sets_exercise ON workout_sets(workout_exercise_id, set_number);
CREATE INDEX idx_workout_sets_completed ON workout_sets(completed);

-- ==================== HEALTH METRICS ====================
CREATE TABLE IF NOT EXISTS health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL CHECK (metric_type IN (
    'heart_rate', 'steps', 'distance', 'calories_burned',
    'sleep_duration', 'resting_heart_rate', 'vo2_max',
    'blood_pressure_systolic', 'blood_pressure_diastolic'
  )),
  value DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  source TEXT CHECK (source IN ('wear_os', 'health_connect', 'manual', 'apple_health')),
  device_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for health metrics
CREATE INDEX idx_health_metrics_user_id ON health_metrics(user_id);
CREATE INDEX idx_health_metrics_type ON health_metrics(metric_type);
CREATE INDEX idx_health_metrics_recorded_at ON health_metrics(recorded_at DESC);
CREATE INDEX idx_health_metrics_user_type_date ON health_metrics(user_id, metric_type, recorded_at DESC);
CREATE INDEX idx_health_metrics_source ON health_metrics(source);

-- ==================== BODY MEASUREMENTS ====================
CREATE TABLE IF NOT EXISTS body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ NOT NULL,
  weight_kg DECIMAL(5,2),
  body_fat_percentage DECIMAL(4,2),
  muscle_mass_kg DECIMAL(5,2),
  measurements JSONB DEFAULT '{}',
  notes TEXT,
  source TEXT CHECK (source IN ('manual', 'smart_scale', 'health_connect')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for body measurements
CREATE INDEX idx_body_measurements_user_id ON body_measurements(user_id);
CREATE INDEX idx_body_measurements_measured_at ON body_measurements(measured_at DESC);
CREATE INDEX idx_body_measurements_user_date ON body_measurements(user_id, measured_at DESC);

-- ==================== WEBHOOKS ====================
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  secret TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for webhooks
CREATE INDEX idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX idx_webhooks_active ON webhooks(active) WHERE active = TRUE;

-- ==================== SYNC TOKENS ====================
CREATE TABLE IF NOT EXISTS sync_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  last_sync_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, device_id)
);

-- Indexes for sync tokens
CREATE INDEX idx_sync_tokens_user_device ON sync_tokens(user_id, device_id);
CREATE INDEX idx_sync_tokens_token ON sync_tokens(token);

-- ==================== API KEYS ====================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  scopes TEXT[] NOT NULL,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for API keys
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);

-- ==================== RATE LIMITS ====================
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  requests INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, endpoint, window_start)
);

-- Indexes for rate limits
CREATE INDEX idx_rate_limits_user_endpoint ON rate_limits(user_id, endpoint, window_start);

-- ==================== AUDIT LOG ====================
CREATE TABLE IF NOT EXISTS fitness_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit log
CREATE INDEX idx_audit_log_user_id ON fitness_audit_log(user_id);
CREATE INDEX idx_audit_log_resource ON fitness_audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created_at ON fitness_audit_log(created_at DESC);

-- ==================== TRIGGERS ====================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_exercises_updated_at BEFORE UPDATE ON exercises
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routines_updated_at BEFORE UPDATE ON workout_routines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workouts_updated_at BEFORE UPDATE ON workouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Calculate workout metrics
CREATE OR REPLACE FUNCTION calculate_workout_metrics()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE workouts
  SET
    total_volume = (
      SELECT COALESCE(SUM(COALESCE(actual_weight, 0) * COALESCE(actual_reps, 0)), 0)
      FROM workout_sets ws
      JOIN workout_exercises we ON ws.workout_exercise_id = we.id
      WHERE we.workout_id = NEW.workout_id
    ),
    total_reps = (
      SELECT COALESCE(SUM(actual_reps), 0)
      FROM workout_sets ws
      JOIN workout_exercises we ON ws.workout_exercise_id = we.id
      WHERE we.workout_id = NEW.workout_id
    ),
    total_sets = (
      SELECT COUNT(*)
      FROM workout_sets ws
      JOIN workout_exercises we ON ws.workout_exercise_id = we.id
      WHERE we.workout_id = NEW.workout_id AND ws.completed = TRUE
    )
  WHERE id = NEW.workout_id;

  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_metrics_on_set_update
  AFTER INSERT OR UPDATE ON workout_sets
  FOR EACH ROW
  EXECUTE FUNCTION calculate_workout_metrics();

-- ==================== VIEWS ====================

-- Workout statistics view
CREATE OR REPLACE VIEW workout_stats_by_user AS
SELECT
  user_id,
  COUNT(*) as total_workouts,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_workouts,
  SUM(duration_seconds) as total_duration_seconds,
  SUM(total_volume) as total_volume,
  SUM(total_reps) as total_reps,
  SUM(total_sets) as total_sets,
  AVG(duration_seconds) as avg_duration_seconds,
  MAX(started_at) as last_workout_at
FROM workouts
GROUP BY user_id;

-- Exercise popularity view
CREATE OR REPLACE VIEW popular_exercises AS
SELECT
  e.id,
  e.name,
  e.category,
  COUNT(DISTINCT we.workout_id) as workout_count,
  COUNT(we.id) as usage_count,
  AVG(ws.actual_weight) as avg_weight,
  MAX(ws.actual_weight) as max_weight
FROM exercises e
JOIN workout_exercises we ON e.id = we.exercise_id
LEFT JOIN workout_sets ws ON we.id = ws.workout_exercise_id
GROUP BY e.id, e.name, e.category;

-- Personal records view
CREATE OR REPLACE VIEW personal_records AS
SELECT DISTINCT ON (we.exercise_id, w.user_id)
  w.user_id,
  we.exercise_id,
  e.name as exercise_name,
  ws.actual_weight as weight,
  ws.actual_reps as reps,
  w.started_at as achieved_at
FROM workout_sets ws
JOIN workout_exercises we ON ws.workout_exercise_id = we.id
JOIN workouts w ON we.workout_id = w.id
JOIN exercises e ON we.exercise_id = e.id
WHERE ws.completed = TRUE AND ws.actual_weight IS NOT NULL
ORDER BY we.exercise_id, w.user_id, ws.actual_weight DESC, ws.actual_reps DESC;

-- ==================== SEED DATA ====================

-- Insert default exercises (sample)
INSERT INTO exercises (name, description, category, muscle_groups, equipment, difficulty, instructions, is_custom) VALUES
('Bench Press', 'Horizontal pressing movement for chest development', 'strength', ARRAY['chest', 'triceps', 'shoulders'], ARRAY['barbell'], 'intermediate', ARRAY[
  'Lie flat on bench with feet on floor',
  'Grip bar slightly wider than shoulder width',
  'Lower bar to chest with control',
  'Press bar back to starting position'
], FALSE),
('Squat', 'Fundamental lower body compound movement', 'strength', ARRAY['quadriceps', 'glutes', 'hamstrings'], ARRAY['barbell'], 'intermediate', ARRAY[
  'Position bar on upper back',
  'Stand with feet shoulder-width apart',
  'Descend by breaking at hips and knees',
  'Drive through heels to stand'
], FALSE),
('Deadlift', 'Full body pulling movement', 'strength', ARRAY['back', 'hamstrings', 'glutes'], ARRAY['barbell'], 'advanced', ARRAY[
  'Stand with feet hip-width apart',
  'Grip bar outside legs',
  'Keep back straight, chest up',
  'Drive through heels, extend hips'
], FALSE),
('Pull-up', 'Vertical pulling bodyweight exercise', 'strength', ARRAY['back', 'biceps'], ARRAY['bodyweight'], 'intermediate', ARRAY[
  'Hang from bar with overhand grip',
  'Pull body up until chin over bar',
  'Lower with control to full hang'
], FALSE),
('Push-up', 'Fundamental horizontal pressing movement', 'bodyweight', ARRAY['chest', 'triceps', 'shoulders'], ARRAY['bodyweight'], 'beginner', ARRAY[
  'Start in plank position',
  'Lower body until chest near ground',
  'Push back to starting position'
], FALSE),
('Running', 'Cardiovascular endurance exercise', 'cardio', ARRAY['full_body'], ARRAY['none'], 'beginner', ARRAY[
  'Maintain upright posture',
  'Land midfoot, not heel',
  'Swing arms naturally',
  'Breathe rhythmically'
], FALSE),
('Plank', 'Core stability exercise', 'bodyweight', ARRAY['core'], ARRAY['bodyweight'], 'beginner', ARRAY[
  'Start in forearm plank position',
  'Keep body straight from head to heels',
  'Engage core, don''t let hips sag',
  'Hold for time'
], FALSE);

-- Grant permissions (adjust as needed)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO fitness_api_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO fitness_api_user;
```

## Next.js API Route Implementation

### Example API Route: Create Workout

`app/api/v1/workouts/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { authenticate } from '@/lib/api/auth';
import { generateRequestId } from '@/lib/api/utils';
import { checkRateLimit } from '@/lib/api/rate-limit';

// Validation schema
const workoutCreateSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  routine_id: z.string().uuid().optional(),
  started_at: z.string().datetime(),
  status: z.enum(['planned', 'in_progress', 'completed', 'cancelled']).default('in_progress'),
  location: z.object({
    type: z.enum(['gym', 'home', 'outdoor']),
    name: z.string().optional()
  }).optional()
});

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    // 1. Authenticate
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({
        error: {
          code: 'AUTH_MISSING_TOKEN',
          message: 'Authentication required',
          documentation_url: 'https://docs.fulltracker.app/errors/AUTH_MISSING_TOKEN'
        },
        meta: {
          api_version: '1.0',
          request_id: requestId,
          timestamp: new Date().toISOString()
        }
      }, { status: 401 });
    }

    // 2. Rate limiting
    const rateLimitResult = await checkRateLimit(user.id, 'POST:/api/v1/workouts');
    if (!rateLimitResult.allowed) {
      return NextResponse.json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded. Please retry later.',
          details: {
            limit: rateLimitResult.limit,
            remaining: 0,
            reset_at: rateLimitResult.resetAt
          }
        },
        meta: {
          api_version: '1.0',
          request_id: requestId,
          timestamp: new Date().toISOString()
        }
      }, {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.floor(rateLimitResult.resetAt.getTime() / 1000).toString(),
          'Retry-After': Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000).toString()
        }
      });
    }

    // 3. Parse and validate body
    const body = await request.json();
    const validated = workoutCreateSchema.parse(body);

    // 4. Handle idempotency
    const idempotencyKey = request.headers.get('Idempotency-Key');
    if (idempotencyKey) {
      const existing = await db.query(
        'SELECT * FROM workouts WHERE user_id = $1 AND client_id = $2',
        [user.id, idempotencyKey]
      );

      if (existing.rows.length > 0) {
        return NextResponse.json({
          data: existing.rows[0],
          meta: {
            api_version: '1.0',
            request_id: requestId,
            timestamp: new Date().toISOString()
          }
        }, { status: 201 });
      }
    }

    // 5. Create workout
    const result = await db.query(
      `INSERT INTO workouts (
        user_id, title, description, routine_id, status,
        started_at, location_type, location_name,
        sync_source, client_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        user.id,
        validated.title,
        validated.description,
        validated.routine_id,
        validated.status,
        validated.started_at,
        validated.location?.type,
        validated.location?.name,
        'web',
        idempotencyKey
      ]
    );

    const workout = result.rows[0];

    // 6. Audit log
    await db.query(
      `INSERT INTO fitness_audit_log (user_id, action, resource_type, resource_id, ip_address)
       VALUES ($1, 'create', 'workout', $2, $3)`,
      [user.id, workout.id, request.ip]
    );

    // 7. Return response
    return NextResponse.json({
      data: workout,
      meta: {
        api_version: '1.0',
        request_id: requestId,
        timestamp: new Date().toISOString()
      }
    }, {
      status: 201,
      headers: {
        'Location': `/api/v1/workouts/${workout.id}`
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: {
          code: 'VAL_REQUIRED_FIELD',
          message: 'Validation failed',
          field_errors: error.errors.map(err => ({
            field: err.path.join('.'),
            code: err.code,
            message: err.message
          })),
          documentation_url: 'https://docs.fulltracker.app/errors/VAL_REQUIRED_FIELD'
        },
        meta: {
          api_version: '1.0',
          request_id: requestId,
          timestamp: new Date().toISOString()
        }
      }, { status: 422 });
    }

    console.error('Workout creation error:', error);
    return NextResponse.json({
      error: {
        code: 'SRV_INTERNAL_ERROR',
        message: 'An internal error occurred',
        documentation_url: 'https://docs.fulltracker.app/errors/SRV_INTERNAL_ERROR'
      },
      meta: {
        api_version: '1.0',
        request_id: requestId,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Implementation for listing workouts with pagination, filtering, etc.
  // Similar pattern to POST
}
```

### Authentication Helper

`lib/api/auth.ts`

```typescript
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/jwt';

export interface AuthenticatedUser {
  id: string;
  email: string;
  scopes: string[];
}

export async function authenticate(request: NextRequest): Promise<AuthenticatedUser | null> {
  const authHeader = request.headers.get('Authorization');
  const apiKeyHeader = request.headers.get('X-API-Key');

  // Bearer token authentication
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    try {
      const payload = await verifyJWT(token);
      return {
        id: payload.sub,
        email: payload.email,
        scopes: payload.scope?.split(' ') || []
      };
    } catch (error) {
      return null;
    }
  }

  // API key authentication
  if (apiKeyHeader) {
    const result = await db.query(
      `SELECT api_keys.*, users.email
       FROM api_keys
       JOIN users ON api_keys.user_id = users.id
       WHERE key_hash = $1
         AND (expires_at IS NULL OR expires_at > NOW())`,
      [hashApiKey(apiKeyHeader)]
    );

    if (result.rows.length > 0) {
      const apiKey = result.rows[0];

      // Update last used
      await db.query(
        'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
        [apiKey.id]
      );

      return {
        id: apiKey.user_id,
        email: apiKey.email,
        scopes: apiKey.scopes
      };
    }
  }

  // Session-based authentication (for web app)
  // ... implement based on your existing session management

  return null;
}

export function requireScopes(user: AuthenticatedUser, requiredScopes: string[]): boolean {
  return requiredScopes.every(scope => user.scopes.includes(scope));
}

function hashApiKey(key: string): string {
  // Implement secure hashing
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(key).digest('hex');
}
```

### Rate Limiting

`lib/api/rate-limit.ts`

```typescript
import { db } from '@/lib/db';

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
}

const RATE_LIMITS = {
  'POST:/api/v1/workouts': { limit: 100, windowMinutes: 60 },
  'GET:/api/v1/workouts': { limit: 1000, windowMinutes: 60 },
  'POST:/api/v1/workouts/batch': { limit: 50, windowMinutes: 60 },
  'default': { limit: 1000, windowMinutes: 60 }
};

export async function checkRateLimit(
  userId: string,
  endpoint: string
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS.default;
  const windowStart = new Date(Date.now() - config.windowMinutes * 60 * 1000);

  // Use PostgreSQL for distributed rate limiting
  const result = await db.query(
    `INSERT INTO rate_limits (user_id, endpoint, requests, window_start)
     VALUES ($1, $2, 1, NOW())
     ON CONFLICT (user_id, endpoint, window_start)
     DO UPDATE SET requests = rate_limits.requests + 1
     RETURNING requests`,
    [userId, endpoint]
  );

  const requests = result.rows[0].requests;
  const allowed = requests <= config.limit;
  const resetAt = new Date(Date.now() + config.windowMinutes * 60 * 1000);

  // Clean up old rate limit records
  await db.query(
    'DELETE FROM rate_limits WHERE window_start < $1',
    [windowStart]
  );

  return {
    allowed,
    limit: config.limit,
    remaining: Math.max(0, config.limit - requests),
    resetAt
  };
}
```

## WebSocket Implementation

### WebSocket Server

`lib/api/websocket.ts`

```typescript
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { verifyJWT } from '@/lib/jwt';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  workoutId?: string;
  isAlive?: boolean;
}

export function setupWebSocketServer(server: any) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (request: IncomingMessage, socket: any, head: Buffer) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);

    if (url.pathname.startsWith('/api/v1/workouts/') && url.pathname.endsWith('/live')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', async (ws: AuthenticatedWebSocket, request: IncomingMessage) => {
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (data: string) => {
      try {
        const message = JSON.parse(data);

        // Handle authentication
        if (message.type === 'auth') {
          const payload = await verifyJWT(message.token);
          ws.userId = payload.sub;

          const url = new URL(request.url || '', `http://${request.headers.host}`);
          const match = url.pathname.match(/\/workouts\/([^/]+)\/live/);
          ws.workoutId = match?.[1];

          ws.send(JSON.stringify({
            type: 'ack',
            status: 'success',
            message: 'Authenticated'
          }));
          return;
        }

        // Require authentication for other messages
        if (!ws.userId) {
          ws.send(JSON.stringify({
            type: 'error',
            code: 'AUTH_REQUIRED',
            message: 'Authentication required'
          }));
          return;
        }

        // Handle workout events
        switch (message.type) {
          case 'set.completed':
            await handleSetCompleted(ws, message.payload);
            break;
          case 'rest.started':
            await handleRestStarted(ws, message.payload);
            break;
          case 'exercise.started':
            await handleExerciseStarted(ws, message.payload);
            break;
          case 'workout.paused':
            await handleWorkoutPaused(ws, message.payload);
            break;
          case 'workout.resumed':
            await handleWorkoutResumed(ws, message.payload);
            break;
          default:
            ws.send(JSON.stringify({
              type: 'error',
              code: 'UNKNOWN_EVENT',
              message: 'Unknown event type'
            }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          code: 'INVALID_MESSAGE',
          message: 'Invalid message format'
        }));
      }
    });

    ws.on('close', () => {
      // Cleanup
    });
  });

  // Heartbeat to detect broken connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws: AuthenticatedWebSocket) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  return wss;
}

async function handleSetCompleted(ws: AuthenticatedWebSocket, payload: any) {
  // Update database
  const { db } = await import('@/lib/db');
  await db.query(
    `UPDATE workout_sets
     SET actual_reps = $1, actual_weight = $2, rpe = $3,
         completed = TRUE, completed_at = NOW()
     WHERE id = $4`,
    [payload.actual_reps, payload.actual_weight, payload.rpe, payload.set_id]
  );

  // Send acknowledgment
  ws.send(JSON.stringify({
    type: 'ack',
    event_id: payload.set_id,
    status: 'success'
  }));

  // Broadcast workout stats update
  const stats = await calculateWorkoutStats(ws.workoutId!);
  ws.send(JSON.stringify({
    type: 'workout.stats',
    payload: stats
  }));
}

async function calculateWorkoutStats(workoutId: string) {
  const { db } = await import('@/lib/db');
  const result = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE ws.completed = TRUE) as total_sets_completed,
       COALESCE(SUM(ws.actual_reps), 0) as total_reps,
       COALESCE(SUM(ws.actual_weight * ws.actual_reps), 0) as total_volume,
       EXTRACT(EPOCH FROM (NOW() - w.started_at))::INTEGER as duration_seconds
     FROM workouts w
     LEFT JOIN workout_exercises we ON w.id = we.workout_id
     LEFT JOIN workout_sets ws ON we.id = ws.workout_exercise_id
     WHERE w.id = $1
     GROUP BY w.id, w.started_at`,
    [workoutId]
  );

  return result.rows[0];
}

// Implement other handlers similarly
async function handleRestStarted(ws: AuthenticatedWebSocket, payload: any) { /* ... */ }
async function handleExerciseStarted(ws: AuthenticatedWebSocket, payload: any) { /* ... */ }
async function handleWorkoutPaused(ws: AuthenticatedWebSocket, payload: any) { /* ... */ }
async function handleWorkoutResumed(ws: AuthenticatedWebSocket, payload: any) { /* ... */ }
```

## Client SDK Examples

### TypeScript/JavaScript Client

```typescript
// lib/sdk/fitness-api-client.ts
export class FitnessAPIClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: { apiKey: string; baseUrl?: string }) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.fulltracker.app/v1';
  }

  private async request<T>(
    method: string,
    path: string,
    options?: {
      body?: any;
      query?: Record<string, any>;
      idempotencyKey?: string;
    }
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);

    if (options?.query) {
      Object.entries(options.query).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const headers: HeadersInit = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };

    if (options?.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      const error = await response.json();
      throw new APIError(error.error.code, error.error.message, response.status);
    }

    return response.json();
  }

  // Workouts
  async createWorkout(data: WorkoutCreate, idempotencyKey?: string) {
    return this.request<WorkoutResponse>('POST', '/workouts', {
      body: data,
      idempotencyKey
    });
  }

  async getWorkout(id: string) {
    return this.request<WorkoutResponse>('GET', `/workouts/${id}`);
  }

  async listWorkouts(params?: {
    status?: string;
    from_date?: string;
    to_date?: string;
    page?: number;
    limit?: number;
  }) {
    return this.request<PaginatedWorkoutsResponse>('GET', '/workouts', {
      query: params
    });
  }

  async updateWorkout(id: string, data: WorkoutUpdate) {
    return this.request<WorkoutResponse>('PATCH', `/workouts/${id}`, {
      body: data
    });
  }

  // Exercises
  async listExercises(params?: {
    category?: string;
    search?: string;
    page?: number;
  }) {
    return this.request<PaginatedExercisesResponse>('GET', '/exercises', {
      query: params
    });
  }

  // Batch operations
  async batchCreateWorkouts(workouts: Array<WorkoutCreate & { client_id: string }>) {
    return this.request<BatchWorkoutResponse>('POST', '/workouts/batch', {
      body: { workouts }
    });
  }

  // WebSocket connection
  connectLiveWorkout(workoutId: string): WorkoutWebSocket {
    const ws = new WebSocket(`${this.baseUrl.replace('http', 'ws')}/workouts/${workoutId}/live`);

    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({
        type: 'auth',
        token: this.apiKey
      }));
    });

    return new WorkoutWebSocket(ws);
  }
}

class WorkoutWebSocket {
  constructor(private ws: WebSocket) {}

  completeSet(setId: string, data: SetComplete) {
    this.ws.send(JSON.stringify({
      type: 'set.completed',
      payload: { set_id: setId, ...data }
    }));
  }

  on(event: string, callback: (data: any) => void) {
    this.ws.addEventListener('message', (e) => {
      const message = JSON.parse(e.data);
      if (message.type === event) {
        callback(message.payload);
      }
    });
  }

  close() {
    this.ws.close();
  }
}

class APIError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message);
  }
}
```

### React Hook for Real-time Workout

```typescript
// hooks/use-live-workout.ts
import { useEffect, useState, useCallback } from 'react';
import { FitnessAPIClient } from '@/lib/sdk/fitness-api-client';

export function useLiveWorkout(workoutId: string) {
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [connected, setConnected] = useState(false);
  const [ws, setWs] = useState<any>(null);

  useEffect(() => {
    const client = new FitnessAPIClient({
      apiKey: process.env.NEXT_PUBLIC_API_KEY!
    });

    const socket = client.connectLiveWorkout(workoutId);

    socket.on('workout.stats', (data) => {
      setStats(data);
    });

    socket.on('ack', (data) => {
      if (data.status === 'success') {
        setConnected(true);
      }
    });

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [workoutId]);

  const completeSet = useCallback((setId: string, data: SetComplete) => {
    if (ws) {
      ws.completeSet(setId, data);
    }
  }, [ws]);

  return {
    stats,
    connected,
    completeSet
  };
}
```

## Testing

### Integration Test Example

```typescript
// tests/api/workouts.test.ts
import { describe, it, expect, beforeAll } from '@jest/globals';
import { FitnessAPIClient } from '@/lib/sdk/fitness-api-client';

describe('Workout API', () => {
  let client: FitnessAPIClient;
  let testWorkoutId: string;

  beforeAll(() => {
    client = new FitnessAPIClient({
      apiKey: process.env.TEST_API_KEY!,
      baseUrl: 'http://localhost:3000/api/v1'
    });
  });

  it('should create a workout', async () => {
    const response = await client.createWorkout({
      title: 'Test Workout',
      started_at: new Date().toISOString(),
      status: 'in_progress'
    });

    expect(response.data.id).toBeDefined();
    expect(response.data.title).toBe('Test Workout');

    testWorkoutId = response.data.id;
  });

  it('should retrieve workout by id', async () => {
    const response = await client.getWorkout(testWorkoutId);

    expect(response.data.id).toBe(testWorkoutId);
    expect(response.data.title).toBe('Test Workout');
  });

  it('should handle idempotency', async () => {
    const idempotencyKey = 'test-key-123';

    const response1 = await client.createWorkout({
      title: 'Idempotent Workout',
      started_at: new Date().toISOString()
    }, idempotencyKey);

    const response2 = await client.createWorkout({
      title: 'Idempotent Workout',
      started_at: new Date().toISOString()
    }, idempotencyKey);

    expect(response1.data.id).toBe(response2.data.id);
  });

  it('should enforce rate limits', async () => {
    // Make many requests to trigger rate limit
    const promises = Array.from({ length: 150 }, () =>
      client.listWorkouts()
    );

    await expect(Promise.all(promises)).rejects.toThrow('RATE_LIMIT_EXCEEDED');
  });
});
```

## Deployment Considerations

### Environment Variables

```bash
# .env.production
DATABASE_URL=postgresql://...
JWT_SECRET=...
API_RATE_LIMIT_ENABLED=true
WEBSOCKET_ENABLED=true
HEALTH_CONNECT_WEBHOOK_SECRET=...
```

### API Documentation

Deploy OpenAPI spec with Swagger UI or Redoc:

```typescript
// app/api/docs/route.ts
import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as yaml from 'yaml';

export async function GET() {
  const spec = yaml.parse(
    fs.readFileSync('./docs/api/openapi-fitness.yaml', 'utf8')
  );

  return NextResponse.json(spec);
}
```

### Monitoring

```typescript
// lib/api/monitoring.ts
export function logAPIRequest(
  method: string,
  path: string,
  status: number,
  duration: number,
  userId?: string
) {
  // Send to monitoring service (DataDog, New Relic, etc.)
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    method,
    path,
    status,
    duration_ms: duration,
    user_id: userId
  }));
}
```

## Next Steps

1. Implement core API routes following the patterns above
2. Set up authentication with OAuth 2.0
3. Deploy database migrations
4. Create client SDKs for Wear OS (Kotlin) and iOS (Swift)
5. Set up Health Connect integration
6. Implement webhook system for real-time sync
7. Add comprehensive API documentation
8. Set up monitoring and alerting
