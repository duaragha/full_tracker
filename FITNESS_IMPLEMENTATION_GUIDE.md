# Fitness Tracking Implementation Guide for Full Tracker

## What You Need to Add Hevy-Style Fitness Tracking

Based on comprehensive research using specialized agents, here's exactly what you need to implement fitness tracking similar to Hevy into your existing full_tracker app.

## 1. Database Schema (PostgreSQL)

### Core Tables You Need

```sql
-- 1. Exercise Library (Pre-populated with 100+ exercises)
CREATE TABLE exercises (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100), -- 'Barbell', 'Dumbbell', 'Bodyweight', etc.
  primary_muscle VARCHAR(100), -- 'Chest', 'Back', 'Legs', etc.
  secondary_muscles TEXT[], -- Array of secondary muscles
  equipment VARCHAR(100), -- 'Barbell', 'Dumbbell', 'Cable', etc.
  difficulty VARCHAR(20), -- 'Beginner', 'Intermediate', 'Advanced'
  instructions TEXT,
  video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Workout Routines (Templates/Programs)
CREATE TABLE workout_routines (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  folder_id INTEGER REFERENCES routine_folders(id),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Routine Folders (Organization)
CREATE TABLE routine_folders (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(7), -- Hex color
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Routine Exercises (What's in each routine)
CREATE TABLE routine_exercises (
  id SERIAL PRIMARY KEY,
  routine_id INTEGER REFERENCES workout_routines(id) ON DELETE CASCADE,
  exercise_id INTEGER REFERENCES exercises(id),
  exercise_order INTEGER NOT NULL,
  sets_count INTEGER DEFAULT 3,
  target_reps VARCHAR(20), -- '8-12', '15', etc.
  target_weight DECIMAL(6,2),
  rest_seconds INTEGER DEFAULT 90,
  notes TEXT,
  superset_group INTEGER -- For grouping supersets
);

-- 5. Workout Sessions (Actual workouts performed)
CREATE TABLE workout_sessions (
  id SERIAL PRIMARY KEY,
  routine_id INTEGER REFERENCES workout_routines(id),
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  notes TEXT,
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),
  body_weight DECIMAL(5,2),
  source VARCHAR(20) DEFAULT 'web', -- 'web', 'pwa', 'watch', 'health_connect'
  source_id TEXT, -- External ID for sync
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Workout Sets (Individual sets within a workout)
CREATE TABLE workout_sets (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id INTEGER REFERENCES exercises(id),
  set_number INTEGER NOT NULL,
  reps INTEGER,
  weight_kg DECIMAL(6,2),
  distance_meters INTEGER,
  duration_seconds INTEGER,
  rpe DECIMAL(3,1) CHECK (rpe BETWEEN 1 AND 10), -- Rate of Perceived Exertion
  set_type VARCHAR(20) DEFAULT 'normal', -- 'warmup', 'normal', 'dropset', 'failure'
  is_personal_record BOOLEAN DEFAULT false,
  notes TEXT,
  heart_rate_avg INTEGER,
  heart_rate_max INTEGER,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Personal Records
CREATE TABLE personal_records (
  id SERIAL PRIMARY KEY,
  exercise_id INTEGER REFERENCES exercises(id),
  record_type VARCHAR(50), -- '1rm', 'max_weight', 'max_reps', 'max_volume'
  value DECIMAL(10,2),
  set_id INTEGER REFERENCES workout_sets(id),
  achieved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Body Measurements
CREATE TABLE body_measurements (
  id SERIAL PRIMARY KEY,
  measurement_date DATE NOT NULL,
  weight DECIMAL(5,2),
  body_fat_percentage DECIMAL(4,2),
  muscle_mass DECIMAL(5,2),
  -- Measurements in cm
  chest DECIMAL(5,2),
  waist DECIMAL(5,2),
  hips DECIMAL(5,2),
  left_arm DECIMAL(5,2),
  right_arm DECIMAL(5,2),
  left_thigh DECIMAL(5,2),
  right_thigh DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Progress Photos
CREATE TABLE progress_photos (
  id SERIAL PRIMARY KEY,
  photo_date DATE NOT NULL,
  photo_url TEXT NOT NULL,
  photo_type VARCHAR(20), -- 'front', 'side', 'back'
  weight DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Important Indexes for Performance
CREATE INDEX idx_workout_sessions_started_at ON workout_sessions(started_at DESC);
CREATE INDEX idx_workout_sets_session_id ON workout_sets(session_id);
CREATE INDEX idx_workout_sets_exercise_id ON workout_sets(exercise_id);
CREATE INDEX idx_personal_records_exercise_id ON personal_records(exercise_id);
CREATE INDEX idx_workout_sessions_source ON workout_sessions(source, source_id);
```

## 2. Service Layer Architecture

### WorkoutService.ts
```typescript
import { pool } from '@/lib/db';

export class WorkoutService {
  // Start a new workout session
  static async startWorkout(routineId?: number) {
    const result = await pool.query(
      `INSERT INTO workout_sessions (routine_id, started_at, source)
       VALUES ($1, NOW(), 'web')
       RETURNING *`,
      [routineId]
    );
    return result.rows[0];
  }

  // Log a set
  static async logSet(data: {
    sessionId: number;
    exerciseId: number;
    setNumber: number;
    reps: number;
    weight: number;
    rpe?: number;
    setType?: string;
  }) {
    // Check for personal record
    const isPR = await this.checkPersonalRecord(
      data.exerciseId,
      data.weight,
      data.reps
    );

    const result = await pool.query(
      `INSERT INTO workout_sets
       (session_id, exercise_id, set_number, reps, weight_kg, rpe, set_type, is_personal_record)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.sessionId,
        data.exerciseId,
        data.setNumber,
        data.reps,
        data.weight,
        data.rpe,
        data.setType || 'normal',
        isPR
      ]
    );

    if (isPR) {
      await this.recordPersonalRecord(data.exerciseId, data.weight, result.rows[0].id);
    }

    return result.rows[0];
  }

  // Calculate 1RM using Brzycki formula
  static calculate1RM(weight: number, reps: number): number {
    if (reps === 1) return weight;
    return Math.round(weight * (36 / (37 - reps)));
  }

  // Get workout history
  static async getWorkoutHistory(limit = 20, offset = 0) {
    const result = await pool.query(
      `SELECT
        ws.*,
        COUNT(DISTINCT wse.exercise_id) as exercise_count,
        COUNT(wse.id) as total_sets,
        SUM(wse.reps * wse.weight_kg) as total_volume
       FROM workout_sessions ws
       LEFT JOIN workout_sets wse ON ws.id = wse.session_id
       GROUP BY ws.id
       ORDER BY ws.started_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  // Get exercise statistics
  static async getExerciseStats(exerciseId: number) {
    const result = await pool.query(
      `SELECT
        MAX(weight_kg) as max_weight,
        MAX(reps) as max_reps,
        AVG(weight_kg) as avg_weight,
        COUNT(DISTINCT session_id) as total_sessions,
        MAX(weight_kg * reps) as max_volume
       FROM workout_sets
       WHERE exercise_id = $1`,
      [exerciseId]
    );
    return result.rows[0];
  }
}
```

## 3. API Endpoints for Future Integration

### RESTful API Structure
```typescript
// app/api/v1/workouts/route.ts
// Supports Wear OS and future mobile app

export async function GET(req: Request) {
  // List workouts with pagination
  // Supports filtering by date, source (web/watch/health_connect)
}

export async function POST(req: Request) {
  // Create new workout session
  // Supports batch operations for offline sync
}

// app/api/v1/workouts/[id]/sets/route.ts
export async function POST(req: Request) {
  // Log sets with support for:
  // - Batch upload from watch
  // - Heart rate data
  // - Offline timestamps
}

// app/api/v1/sync/health-connect/route.ts
export async function POST(req: Request) {
  // Webhook endpoint for Health Connect
  // Bidirectional sync support
}

// WebSocket for real-time workout tracking
// app/api/v1/workouts/[id]/live/route.ts
// Real-time set logging, heart rate streaming
```

## 4. PWA Setup for Future Mobile/Wearable Support

### Progressive Web App Configuration

```json
// public/manifest.json
{
  "name": "Full Tracker Fitness",
  "short_name": "Tracker",
  "start_url": "/workouts",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#3B82F6",
  "background_color": "#000000",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

### Service Worker for Offline Support
```javascript
// public/sw.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then((cache) => {
      return cache.addAll([
        '/workouts',
        '/workouts/active',
        '/api/v1/exercises', // Cache exercise database
      ]);
    })
  );
});

// Offline-first for workout data
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/v1/workouts')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open('v1').then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
      })
    );
  }
});
```

## 5. Health Connect Integration Strategy

### Future Health Connect Support
```typescript
// lib/integrations/health-connect.ts
export class HealthConnectService {
  // Read workouts from Health Connect
  static async syncFromHealthConnect() {
    // Uses Health Connect Web API (2024+)
    // Reads: ExerciseSession, HeartRate, ActiveCaloriesBurned
    // Maps to your workout_sessions and workout_sets tables
  }

  // Write workouts to Health Connect
  static async syncToHealthConnect(sessionId: number) {
    // Exports your workout data to Health Connect
    // Allows syncing with other fitness apps
  }
}
```

### Wear OS Support via PWA
```typescript
// Wear OS accesses PWA through Chrome
// Special UI for small screens
export function WatchWorkoutUI() {
  return (
    <div className="w-full h-full bg-black text-white">
      {/* Large buttons for easy tapping */}
      <button className="w-full h-20 text-2xl">
        Log Set
      </button>
      {/* Rest timer */}
      <RestTimer />
      {/* Heart rate from Bluetooth */}
      <HeartRateMonitor />
    </div>
  );
}
```

## 6. UI Components Structure

### Workout Dashboard
```typescript
// app/workouts/page.tsx
export default function WorkoutsPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <QuickStartCard /> {/* Start workout */}
      <RecentWorkoutsCard />
      <PersonalRecordsCard />
      <ProgressChartCard />
      <UpcomingWorkoutsCard />
    </div>
  );
}
```

### Active Workout Session
```typescript
// app/workouts/active/page.tsx
export default function ActiveWorkoutPage() {
  // Real-time workout tracking
  // Exercise selection
  // Set logging with previous performance shown
  // Rest timer
  // Live duration counter
}
```

### Routine Builder
```typescript
// app/routines/builder/page.tsx
export default function RoutineBuilderPage() {
  // Drag-and-drop exercise ordering
  // Exercise search with filters
  // Set/rep/rest configuration
  // Save to folders
}
```

## 7. Key Features Implementation Priority

### Phase 1: Core Features (Weeks 1-4)
1. **Database setup** with exercise library
2. **Basic workout logging** (sets, reps, weight)
3. **Exercise search** and filtering
4. **Workout history** view
5. **Personal records** detection

### Phase 2: Enhanced Features (Weeks 5-8)
1. **Routine builder** with templates
2. **Progress charts** and analytics
3. **Body measurements** tracking
4. **Rest timer** with notifications
5. **Volume calculations**

### Phase 3: Integration Features (Weeks 9-12)
1. **PWA setup** for mobile access
2. **Offline support** with sync
3. **Health Connect integration** (when available)
4. **WebSocket** for real-time tracking
5. **Export functionality**

## 8. Performance Optimizations

### Database Optimizations
```sql
-- Materialized view for workout statistics
CREATE MATERIALIZED VIEW workout_stats AS
SELECT
  session_id,
  COUNT(*) as total_sets,
  SUM(reps) as total_reps,
  SUM(weight_kg * reps) as total_volume,
  AVG(rpe) as avg_rpe
FROM workout_sets
GROUP BY session_id;

-- Refresh periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY workout_stats;
```

### Caching Strategy
```typescript
// Use Redis for frequently accessed data
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

// Cache exercise library (rarely changes)
await redis.setex('exercises:all', 3600, JSON.stringify(exercises));

// Cache user's recent workouts
await redis.setex(`workouts:recent`, 300, JSON.stringify(recentWorkouts));
```

## 9. Migration from Current Structure

Your existing full_tracker already has:
- PostgreSQL database ✅
- Next.js with App Router ✅
- Server Actions pattern ✅
- Card-based UI components ✅
- Dashboard layout ✅

### Integration Points
1. **Add to existing dashboard** - New "Fitness" section
2. **Reuse MediaDetailModal pattern** - For exercise details
3. **Follow existing migrations** - Continue from 031
4. **Use existing auth** - When you add user support
5. **Extend existing API** - Add /api/v1/fitness routes

## 10. Immediate Next Steps

### Step 1: Run Database Migrations
```bash
# Create migration file
touch db/migrations/031_create_fitness_schema.sql

# Run migration
npm run db:migrate
```

### Step 2: Seed Exercise Database
```sql
-- Insert popular exercises
INSERT INTO exercises (name, category, primary_muscle, equipment) VALUES
('Barbell Bench Press', 'Barbell', 'Chest', 'Barbell'),
('Squat', 'Barbell', 'Legs', 'Barbell'),
('Deadlift', 'Barbell', 'Back', 'Barbell'),
('Pull-up', 'Bodyweight', 'Back', 'None'),
-- ... 100+ more exercises
```

### Step 3: Create Service Layer
```typescript
// lib/services/workout.service.ts
// lib/services/exercise.service.ts
// lib/services/routine.service.ts
```

### Step 4: Build UI Components
```typescript
// components/workouts/WorkoutCard.tsx
// components/workouts/ExerciseSelector.tsx
// components/workouts/SetLogger.tsx
// components/workouts/RestTimer.tsx
```

## Summary

To add Hevy-style fitness tracking to your full_tracker:

1. **Database**: 9 new tables with proper indexes
2. **API**: RESTful endpoints for future mobile/wearable
3. **PWA**: Service worker for offline support
4. **UI**: Workout logging, routine builder, analytics
5. **Integration Ready**: Health Connect and Wear OS support

Total implementation time: **12 weeks** for full feature parity
Minimum viable fitness tracker: **4 weeks**

The architecture is designed to:
- Work with your existing Next.js setup
- Support future Wear OS integration via PWA
- Enable Health Connect sync when available
- Scale to millions of workout records
- Provide offline-first mobile experience

All without the social features you don't need, focusing purely on personal fitness tracking with excellent wearable integration potential.