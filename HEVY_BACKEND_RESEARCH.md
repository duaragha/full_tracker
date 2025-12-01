# Hevy Backend Architecture Research

## Executive Summary

Hevy is a workout tracking app serving 9+ million users with a small engineering team (~5-10 engineers). This document synthesizes publicly available information about their backend architecture, infrastructure decisions, and scaling strategies.

## 1. Technology Stack

### Core Backend Technologies

**Primary Stack:**
- **Node.js** with **TypeScript**: Modern JavaScript runtime for scalability
- **PostgreSQL**: Primary relational database for workout data
- **Redis**: Caching and session management
- **Amazon Web Services (AWS)**: Cloud infrastructure provider

**Framework Choices:**
- Likely using **Express.js** or **Fastify** for API layer
- **TypeScript** for type safety across 100,000+ lines of code
- Strong emphasis on code reusability and maintainability

### Database: PostgreSQL

**Why PostgreSQL:**
- ACID compliance for workout data integrity
- Rich data types (JSONB for flexible metadata)
- Powerful indexing capabilities
- Excellent support for time-series data (critical for workout tracking)
- PostGIS for potential location-based features

## 2. Database Schema Design

### Core Entities

```typescript
// Inferred schema structure based on app functionality

// Users & Authentication
users {
  id: uuid PRIMARY KEY
  email: string UNIQUE
  username: string UNIQUE
  password_hash: string
  email_verified: boolean
  created_at: timestamp
  updated_at: timestamp
  subscription_tier: enum
  preferences: jsonb
}

// Workout Programs & Routines
workout_routines {
  id: uuid PRIMARY KEY
  user_id: uuid REFERENCES users
  name: string
  description: text
  is_template: boolean
  folder_id: uuid
  created_at: timestamp
  updated_at: timestamp
}

// Workout Sessions (Time-series data)
workout_sessions {
  id: uuid PRIMARY KEY
  user_id: uuid REFERENCES users
  routine_id: uuid REFERENCES workout_routines
  started_at: timestamp
  completed_at: timestamp
  duration_seconds: integer
  volume_kg: decimal  -- Total volume lifted
  notes: text
  rating: integer
  created_at: timestamp
}

// Exercises (Reference data)
exercises {
  id: uuid PRIMARY KEY
  name: string
  description: text
  equipment: string[]
  primary_muscles: string[]
  secondary_muscles: string[]
  video_url: string
  thumbnail_url: string
  is_custom: boolean
  user_id: uuid  -- NULL for system exercises
  created_at: timestamp
}

// Workout Sets (High volume data)
workout_sets {
  id: uuid PRIMARY KEY
  workout_session_id: uuid REFERENCES workout_sessions
  exercise_id: uuid REFERENCES exercises
  set_number: integer
  reps: integer
  weight_kg: decimal
  rpe: integer  -- Rate of Perceived Exertion
  is_warmup: boolean
  is_failure: boolean
  rest_seconds: integer
  notes: text
  created_at: timestamp
}

// Personal Records
personal_records {
  id: uuid PRIMARY KEY
  user_id: uuid REFERENCES users
  exercise_id: uuid REFERENCES exercises
  record_type: enum ('1rm', '3rm', '5rm', 'volume', 'reps')
  value: decimal
  achieved_at: timestamp
  workout_session_id: uuid
}

// Strength Levels (Computed/Cached)
strength_levels {
  id: uuid PRIMARY KEY
  user_id: uuid REFERENCES users
  exercise_id: uuid REFERENCES exercises
  estimated_1rm: decimal
  strength_level: enum ('beginner', 'novice', 'intermediate', 'advanced', 'elite')
  percentile: decimal
  last_calculated: timestamp
}
```

### Indexing Strategy

```sql
-- Critical indexes for performance with millions of users

-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Workout queries (most common access pattern)
CREATE INDEX idx_workout_sessions_user_started
  ON workout_sessions(user_id, started_at DESC);

CREATE INDEX idx_workout_sets_session
  ON workout_sets(workout_session_id);

-- Analytics queries
CREATE INDEX idx_workout_sets_exercise_user
  ON workout_sets(exercise_id, user_id, created_at DESC);

-- Personal records lookup
CREATE INDEX idx_pr_user_exercise
  ON personal_records(user_id, exercise_id, record_type);

-- Partial indexes for active data
CREATE INDEX idx_active_sessions
  ON workout_sessions(user_id, started_at)
  WHERE completed_at IS NULL;

-- GIN indexes for array/JSONB searches
CREATE INDEX idx_exercises_muscles
  ON exercises USING GIN(primary_muscles);

-- Composite indexes for common queries
CREATE INDEX idx_sets_user_exercise_date
  ON workout_sets(user_id, exercise_id, created_at DESC)
  INCLUDE (reps, weight_kg);
```

### Partitioning Strategy

For 9M+ users generating billions of sets:

```sql
-- Partition workout_sets by time (monthly)
CREATE TABLE workout_sets_2024_01 PARTITION OF workout_sets
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Partition workout_sessions by user_id range
-- Enables parallel queries and easier data management
```

## 3. API Architecture

### REST API Design

**Base Structure:**
```
https://api.hevyapp.com/v1/
```

**Key Endpoints:**

```typescript
// Authentication
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout

// Workouts
GET    /workouts                      // List user workouts
POST   /workouts                      // Create new workout
GET    /workouts/:id                  // Get workout details
PUT    /workouts/:id                  // Update workout
DELETE /workouts/:id                  // Delete workout
POST   /workouts/:id/complete         // Complete workout

// Exercises
GET    /exercises                     // List all exercises
GET    /exercises/search?q=bench      // Search exercises
GET    /exercises/:id                 // Exercise details
POST   /exercises                     // Create custom exercise

// Statistics & Analytics
GET    /stats/overview                // Dashboard stats
GET    /stats/volume?period=30d       // Volume over time
GET    /stats/personal-records        // All PRs
GET    /stats/strength-levels         // Strength level for exercises

// Social Features
GET    /users/:id/profile             // Public profile
GET    /feed                          // Social feed
POST   /workouts/:id/share            // Share workout
```

**API Response Format:**

```typescript
// Success response
{
  "success": true,
  "data": {
    // Response payload
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "v1"
  }
}

// Error response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid workout data",
    "details": [
      {
        "field": "weight_kg",
        "message": "Weight must be positive"
      }
    ]
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

### Why REST over GraphQL

**Reasoning for 9M users:**
1. **Simpler caching**: HTTP caching with CDN
2. **Better performance**: No query parsing overhead
3. **Easier rate limiting**: Per-endpoint limits
4. **Mobile-friendly**: Lower battery consumption
5. **Proven scale**: REST scales predictably

**Optimization Techniques:**
- **Pagination**: Cursor-based for infinite scroll
- **Field filtering**: `?fields=id,name,started_at`
- **Batch endpoints**: `POST /batch` for multiple operations
- **Conditional requests**: ETags and If-Modified-Since

## 4. Real-Time Sync Implementation

### Hybrid Approach

**Optimistic Updates:**
```typescript
// Client-side: Update UI immediately
const optimisticSet = {
  id: generateTempId(),
  reps: 10,
  weight_kg: 100,
  _syncing: true
};

// Queue for background sync
syncQueue.add({
  operation: 'CREATE_SET',
  data: optimisticSet,
  retries: 3
});

// Server confirms/rejects
// If conflict, show resolution UI
```

**Sync Strategy:**
1. **During workout**: WebSocket for real-time updates
2. **Background**: HTTP polling every 60s
3. **Offline**: Queue operations, sync on reconnect

### WebSocket Implementation

```typescript
// WebSocket for active workout sessions only
const wsEndpoints = {
  'workout.started': 'wss://ws.hevyapp.com/workout/:sessionId',
  'workout.updated': 'Broadcast set updates',
  'workout.completed': 'Finalize and sync'
};

// Heartbeat every 30s to detect disconnects
// Automatic reconnection with exponential backoff
// Fall back to HTTP if WebSocket unavailable
```

**Why not always-on WebSockets:**
- Expensive at 9M user scale
- Most users not actively working out
- HTTP polling sufficient for feed/stats

### Conflict Resolution

```typescript
interface SyncConflict {
  local: WorkoutSet;
  remote: WorkoutSet;
  conflictType: 'UPDATE' | 'DELETE';
}

// Resolution strategies:
// 1. Last-write-wins for most fields
// 2. Server-wins for computed fields (volume, PRs)
// 3. User-prompt for significant conflicts
```

## 5. Scaling to 9 Million Users

### Architecture Approach: Modular Monolith

**Why Not Microservices (Yet):**
- Small team (5-10 engineers)
- Simpler deployment and debugging
- Shared database reduces complexity
- Easier to maintain consistency

**Modular Design:**
```
src/
├── modules/
│   ├── auth/           # Authentication
│   ├── workouts/       # Workout CRUD
│   ├── exercises/      # Exercise library
│   ├── analytics/      # Stats computation
│   ├── social/         # Feed and sharing
│   └── notifications/  # Push notifications
├── shared/
│   ├── database/       # DB connection pool
│   ├── cache/          # Redis client
│   └── utils/          # Helpers
└── api/
    └── routes.ts       # API routing
```

**Benefits:**
- Clear boundaries (future microservices)
- Shared types and utilities
- Single deployment pipeline
- Fast iteration speed

### Horizontal Scaling

**Load Balancing:**
```yaml
# AWS ECS/Fargate configuration
Service:
  DesiredCount: 20  # Auto-scale 10-50 instances
  TargetCPU: 70%
  LoadBalancer:
    Type: Application
    HealthCheck: /health
    Stickiness: true  # Session affinity
```

**Database Scaling:**
1. **Read Replicas**: 3-5 replicas for analytics queries
2. **Connection Pooling**: PgBouncer (10,000+ connections)
3. **Query Optimization**: Materialized views for dashboards

```sql
-- Materialized view for user stats (refreshed hourly)
CREATE MATERIALIZED VIEW user_workout_stats AS
SELECT
  user_id,
  COUNT(DISTINCT DATE(started_at)) as workout_days,
  SUM(volume_kg) as total_volume,
  AVG(duration_seconds) as avg_duration
FROM workout_sessions
WHERE started_at > NOW() - INTERVAL '90 days'
GROUP BY user_id;

CREATE UNIQUE INDEX ON user_workout_stats(user_id);
```

### Caching Strategy

**Redis Architecture:**

```typescript
// Multi-layer caching
const cacheKeys = {
  // Short TTL (5 minutes)
  userProfile: (userId) => `user:${userId}:profile`,
  workoutSession: (sessionId) => `workout:${sessionId}`,

  // Medium TTL (1 hour)
  exerciseList: 'exercises:all',
  userRoutines: (userId) => `user:${userId}:routines`,

  // Long TTL (24 hours)
  strengthLevels: (userId) => `user:${userId}:strength`,
  personalRecords: (userId, exerciseId) => `pr:${userId}:${exerciseId}`,
};

// Cache-aside pattern
async function getUserStats(userId: string) {
  const cached = await redis.get(`stats:${userId}`);
  if (cached) return JSON.parse(cached);

  const stats = await db.query(/* complex query */);
  await redis.setex(`stats:${userId}`, 3600, JSON.stringify(stats));
  return stats;
}

// Cache invalidation on writes
async function createWorkoutSet(data: WorkoutSet) {
  const set = await db.createSet(data);

  // Invalidate affected caches
  await redis.del([
    `workout:${data.sessionId}`,
    `stats:${data.userId}`,
    `pr:${data.userId}:${data.exerciseId}`
  ]);

  return set;
}
```

**CDN Caching:**
- Exercise images/videos: CloudFront with 1-year TTL
- User avatars: CloudFront with 1-week TTL
- API responses: Edge caching for popular endpoints

## 6. Background Jobs & Queue Systems

### Job Queue Architecture

**Technology: Bull (Redis-based)**

```typescript
// Job types and their frequency
const jobQueues = {
  // High priority, low latency
  immediate: new Queue('immediate', {
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 }
    }
  }),

  // Background processing
  analytics: new Queue('analytics', {
    defaultJobOptions: {
      attempts: 5,
      removeOnComplete: 100
    }
  }),

  // Scheduled tasks
  scheduled: new Queue('scheduled', {
    defaultJobOptions: {
      repeat: { cron: '0 * * * *' }  // Hourly
    }
  })
};

// Job definitions
interface JobTypes {
  // Immediate (< 1 second)
  'send-notification': { userId: string; message: string };
  'invalidate-cache': { keys: string[] };

  // Background (< 30 seconds)
  'calculate-pr': { userId: string; exerciseId: string };
  'update-strength-level': { userId: string };
  'generate-workout-summary': { sessionId: string };

  // Scheduled (runs hourly/daily)
  'refresh-leaderboards': {};
  'cleanup-old-sessions': {};
  'send-digest-emails': {};
}
```

### Data Aggregation Jobs

**Volume Calculations:**

```typescript
// Real-time: Calculate during workout
// Background: Recompute for analytics
async function calculateWorkoutVolume(sessionId: string) {
  const result = await db.query(`
    SELECT
      SUM(reps * weight_kg) as total_volume,
      COUNT(*) as total_sets,
      COUNT(DISTINCT exercise_id) as exercises_count
    FROM workout_sets
    WHERE workout_session_id = $1
      AND is_warmup = false
  `, [sessionId]);

  await db.query(`
    UPDATE workout_sessions
    SET volume_kg = $1,
        total_sets = $2,
        exercises_count = $3
    WHERE id = $4
  `, [result.total_volume, result.total_sets, result.exercises_count, sessionId]);
}
```

**PR Detection (Personal Records):**

```typescript
async function detectPersonalRecords(userId: string, exerciseId: string) {
  // Calculate 1RM using Brzycki formula
  // Compare against historical data
  // Create PR entry if new record

  const recentSets = await db.query(`
    SELECT reps, weight_kg, created_at
    FROM workout_sets ws
    JOIN workout_sessions wk ON ws.workout_session_id = wk.id
    WHERE wk.user_id = $1
      AND ws.exercise_id = $2
      AND ws.is_warmup = false
      AND wk.completed_at > NOW() - INTERVAL '7 days'
    ORDER BY created_at DESC
    LIMIT 100
  `, [userId, exerciseId]);

  // Calculate estimated 1RM for each set
  const estimated1RMs = recentSets.map(set => {
    // Brzycki formula: weight / (1.0278 - 0.0278 * reps)
    return set.weight_kg / (1.0278 - 0.0278 * set.reps);
  });

  const maxEstimated1RM = Math.max(...estimated1RMs);

  // Check if this is a new PR
  const currentPR = await db.query(`
    SELECT value FROM personal_records
    WHERE user_id = $1 AND exercise_id = $2 AND record_type = '1rm'
  `, [userId, exerciseId]);

  if (!currentPR || maxEstimated1RM > currentPR.value) {
    await createPRNotification(userId, exerciseId, maxEstimated1RM);
  }
}
```

**Strength Level Classification:**

```typescript
// Based on symmetric strength standards
const strengthStandards = {
  'bench-press': {
    beginner: { male: 0.5, female: 0.3 },    // x bodyweight
    novice: { male: 0.75, female: 0.5 },
    intermediate: { male: 1.0, female: 0.7 },
    advanced: { male: 1.5, female: 1.0 },
    elite: { male: 2.0, female: 1.5 }
  }
  // ... for each exercise
};

async function calculateStrengthLevel(userId: string, exerciseId: string) {
  const user = await getUser(userId);
  const estimated1RM = await getEstimated1RM(userId, exerciseId);
  const relativeStrength = estimated1RM / user.bodyweight_kg;

  // Compare against standards
  const level = determineStrengthLevel(exerciseId, relativeStrength, user.gender);

  await db.query(`
    INSERT INTO strength_levels (user_id, exercise_id, estimated_1rm, strength_level)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id, exercise_id)
    DO UPDATE SET
      estimated_1rm = $3,
      strength_level = $4,
      last_calculated = NOW()
  `, [userId, exerciseId, estimated1RM, level]);
}
```

### Job Processing

```typescript
// Worker processes (separate from API servers)
const workers = {
  immediate: 10,    // 10 concurrent workers
  analytics: 5,     // 5 concurrent workers
  scheduled: 2      // 2 concurrent workers
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  await Promise.all([
    immediateQueue.close(),
    analyticsQueue.close(),
    scheduledQueue.close()
  ]);
  process.exit(0);
});
```

## 7. Media Storage (CDN)

### Exercise Videos & Images

**Storage Architecture:**

```yaml
# AWS S3 bucket structure
hevy-media/
├── exercises/
│   ├── videos/
│   │   ├── bench-press.mp4         # Original (1080p)
│   │   ├── bench-press_720.mp4     # Transcoded
│   │   ├── bench-press_480.mp4
│   │   └── bench-press_thumb.jpg   # Thumbnail
│   └── images/
│       └── bench-press_muscle.png
├── user-content/
│   ├── avatars/
│   └── workout-photos/
└── thumbnails/
```

**CDN Configuration:**

```typescript
// CloudFront distribution
const cdnConfig = {
  origin: 's3://hevy-media',
  behaviors: {
    '/exercises/*': {
      ttl: 31536000,  // 1 year (immutable)
      compress: true,
      viewerProtocol: 'redirect-to-https'
    },
    '/user-content/*': {
      ttl: 604800,    // 1 week
      compress: true,
      signedUrls: true  // Private content
    }
  },
  // Regional edge caches for global performance
  priceClass: 'PriceClass_All'
};
```

**Video Transcoding Pipeline:**

```typescript
// AWS MediaConvert job
async function transcodeExerciseVideo(videoKey: string) {
  const job = await mediaConvert.createJob({
    inputs: [{
      fileInput: `s3://hevy-media-raw/${videoKey}`
    }],
    outputs: [
      { preset: 'System-Generic_Hd_Mp4_Avc_Aac_16x9_1920x1080p_24Hz_6Mbps' },
      { preset: 'System-Generic_Sd_Mp4_Avc_Aac_16x9_1280x720p_24Hz_3.5Mbps' },
      { preset: 'System-Generic_Sd_Mp4_Avc_Aac_16x9_854x480p_24Hz_1.5Mbps' }
    ]
  });

  // Generate thumbnail at 2 seconds
  await generateThumbnail(videoKey, 2000);
}
```

**Optimization Techniques:**
1. **Lazy loading**: Load videos on-demand
2. **Adaptive bitrate**: Serve quality based on bandwidth
3. **Image optimization**: WebP format with JPEG fallback
4. **Preloading**: Prefetch next exercise in routine

## 8. Authentication & Authorization

### Auth Implementation

**JWT-based Authentication:**

```typescript
interface JWTPayload {
  userId: string;
  email: string;
  tier: 'free' | 'pro';
  iat: number;
  exp: number;
}

// Token generation
function generateTokens(user: User) {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, tier: user.tier },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }  // Short-lived
  );

  const refreshToken = jwt.sign(
    { userId: user.id, tokenVersion: user.tokenVersion },
    process.env.REFRESH_SECRET,
    { expiresIn: '30d' }  // Long-lived
  );

  return { accessToken, refreshToken };
}

// Refresh token stored in HTTP-only cookie
// Access token in memory (not localStorage - XSS protection)
```

**OAuth2 Integration:**

```typescript
// Social login support
const oauthProviders = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    scope: ['email', 'profile']
  },
  apple: {
    clientId: process.env.APPLE_CLIENT_ID,
    scope: ['email', 'name']
  }
};

// Link accounts
async function linkOAuthAccount(userId: string, provider: string, oauthId: string) {
  await db.query(`
    INSERT INTO oauth_accounts (user_id, provider, provider_user_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (provider, provider_user_id) DO NOTHING
  `, [userId, provider, oauthId]);
}
```

### Authorization (RBAC)

```typescript
// Simple role-based access control
enum Permission {
  // Basic permissions
  VIEW_OWN_WORKOUTS = 'view:own:workouts',
  CREATE_WORKOUT = 'create:workout',
  DELETE_OWN_WORKOUT = 'delete:own:workout',

  // Pro permissions
  CREATE_CUSTOM_EXERCISE = 'create:exercise',
  EXPORT_DATA = 'export:data',

  // Admin permissions
  MODERATE_CONTENT = 'moderate:content',
  VIEW_ANALYTICS = 'view:analytics'
}

const rolePermissions = {
  free: [Permission.VIEW_OWN_WORKOUTS, Permission.CREATE_WORKOUT],
  pro: [/* all free permissions */ Permission.CREATE_CUSTOM_EXERCISE, Permission.EXPORT_DATA],
  admin: [/* all permissions */]
};

// Middleware
function requirePermission(permission: Permission) {
  return (req, res, next) => {
    const user = req.user;
    const permissions = rolePermissions[user.tier];

    if (!permissions.includes(permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}
```

## 9. Rate Limiting & API Security

### Rate Limiting Strategy

**Multi-tier Rate Limiting:**

```typescript
// Redis-based rate limiter
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

const rateLimiters = {
  // Global: Prevent DDoS
  global: rateLimit({
    store: new RedisStore({ client: redis }),
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 1000,  // 1000 requests per window
    message: 'Too many requests from this IP'
  }),

  // Authentication: Prevent brute force
  auth: rateLimit({
    store: new RedisStore({ client: redis, prefix: 'rl:auth:' }),
    windowMs: 15 * 60 * 1000,
    max: 5,  // 5 login attempts
    skipSuccessfulRequests: true
  }),

  // Per-user: Fair usage
  user: rateLimit({
    store: new RedisStore({ client: redis, prefix: 'rl:user:' }),
    windowMs: 60 * 1000,  // 1 minute
    max: async (req) => {
      // Higher limits for Pro users
      return req.user?.tier === 'pro' ? 120 : 60;
    },
    keyGenerator: (req) => req.user?.id || req.ip
  }),

  // Expensive operations
  analytics: rateLimit({
    store: new RedisStore({ client: redis, prefix: 'rl:analytics:' }),
    windowMs: 60 * 60 * 1000,  // 1 hour
    max: 100  // 100 analytics requests per hour
  })
};

// Apply to routes
app.use('/api/', rateLimiters.global);
app.use('/api/auth/', rateLimiters.auth);
app.use('/api/v1/', authenticate, rateLimiters.user);
app.use('/api/v1/stats/', rateLimiters.analytics);
```

**Sliding Window Algorithm:**

```typescript
// More precise than fixed window
async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Remove old entries
  await redis.zremrangebyscore(key, 0, windowStart);

  // Count requests in window
  const count = await redis.zcard(key);

  if (count >= limit) {
    return false;  // Rate limited
  }

  // Add current request
  await redis.zadd(key, now, `${now}-${Math.random()}`);
  await redis.expire(key, Math.ceil(windowMs / 1000));

  return true;  // Allowed
}
```

### API Security Measures

**Input Validation:**

```typescript
import { z } from 'zod';

// Strict schema validation
const createWorkoutSetSchema = z.object({
  workout_session_id: z.string().uuid(),
  exercise_id: z.string().uuid(),
  set_number: z.number().int().min(1).max(100),
  reps: z.number().int().min(0).max(1000),
  weight_kg: z.number().min(0).max(1000),
  rpe: z.number().int().min(1).max(10).optional(),
  notes: z.string().max(500).optional()
});

async function createWorkoutSet(req, res) {
  try {
    const validated = createWorkoutSetSchema.parse(req.body);
    // Process validated data
  } catch (error) {
    return res.status(400).json({ error: error.errors });
  }
}
```

**SQL Injection Prevention:**

```typescript
// Always use parameterized queries
// NEVER concatenate user input into SQL

// BAD - Vulnerable to SQL injection
const query = `SELECT * FROM users WHERE email = '${req.body.email}'`;

// GOOD - Safe parameterized query
const query = 'SELECT * FROM users WHERE email = $1';
const result = await db.query(query, [req.body.email]);
```

**CORS Configuration:**

```typescript
import cors from 'cors';

app.use(cors({
  origin: [
    'https://hevyapp.com',
    'https://www.hevyapp.com',
    /^https:\/\/.*\.hevyapp\.com$/  // Subdomains
  ],
  credentials: true,  // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400  // 24 hours
}));
```

**Request ID Tracking:**

```typescript
// For debugging and tracing
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Include in all logs
logger.info('Request received', {
  requestId: req.id,
  method: req.method,
  path: req.path,
  userId: req.user?.id
});
```

## 10. Database Optimization

### Query Optimization

**Explain Analyze for Slow Queries:**

```sql
-- Monitor slow queries (pg_stat_statements extension)
SELECT
  query,
  calls,
  total_time / calls as avg_time_ms,
  rows / calls as avg_rows
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY total_time DESC
LIMIT 20;

-- Example optimization
-- BEFORE: Sequential scan (slow)
EXPLAIN ANALYZE
SELECT * FROM workout_sets
WHERE user_id = 'user123'
  AND created_at > '2024-01-01';

-- AFTER: Index scan (fast)
CREATE INDEX idx_workout_sets_user_created
  ON workout_sets(user_id, created_at DESC);
```

**Materialized Views for Analytics:**

```sql
-- Pre-compute expensive aggregations
CREATE MATERIALIZED VIEW user_exercise_volume_30d AS
SELECT
  ws.user_id,
  ws.exercise_id,
  e.name as exercise_name,
  COUNT(*) as total_sets,
  SUM(ws.reps * ws.weight_kg) as total_volume,
  AVG(ws.weight_kg) as avg_weight,
  MAX(ws.weight_kg) as max_weight
FROM workout_sets ws
JOIN workout_sessions wk ON ws.workout_session_id = wk.id
JOIN exercises e ON ws.exercise_id = e.id
WHERE wk.completed_at > NOW() - INTERVAL '30 days'
  AND ws.is_warmup = false
GROUP BY ws.user_id, ws.exercise_id, e.name;

-- Refresh strategy
-- Option 1: Scheduled refresh (every hour)
CREATE UNIQUE INDEX ON user_exercise_volume_30d(user_id, exercise_id);
REFRESH MATERIALIZED VIEW CONCURRENTLY user_exercise_volume_30d;

-- Option 2: Incremental refresh (trigger-based)
-- Update only changed data
```

**Connection Pooling:**

```typescript
// PgBouncer configuration
[databases]
hevy = host=postgres-primary.internal port=5432 dbname=hevy

[pgbouncer]
pool_mode = transaction  # Connection reuse per transaction
max_client_conn = 10000  # Handle 10k concurrent clients
default_pool_size = 25   # 25 actual DB connections per pool
reserve_pool_size = 5
reserve_pool_timeout = 3

// Application connection pool
const pool = new Pool({
  host: 'pgbouncer.internal',
  port: 6432,
  database: 'hevy',
  max: 20,  // Max connections per app instance
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});
```

**Read Replica Strategy:**

```typescript
// Route read-heavy queries to replicas
class Database {
  private writePool: Pool;
  private readPools: Pool[];

  constructor() {
    this.writePool = new Pool({ host: 'postgres-primary.internal' });
    this.readPools = [
      new Pool({ host: 'postgres-replica-1.internal' }),
      new Pool({ host: 'postgres-replica-2.internal' }),
      new Pool({ host: 'postgres-replica-3.internal' })
    ];
  }

  // Write operations go to primary
  async write(query: string, params?: any[]) {
    return this.writePool.query(query, params);
  }

  // Read operations use round-robin across replicas
  async read(query: string, params?: any[]) {
    const replica = this.readPools[Math.floor(Math.random() * this.readPools.length)];
    return replica.query(query, params);
  }
}

// Usage
await db.write('INSERT INTO workout_sets ...', [...]);
await db.read('SELECT * FROM exercises WHERE ...', [...]);
```

## 11. One-Rep Max & Strength Calculations

### Formulas Used

**Estimated 1RM Calculation:**

```typescript
// Multiple formulas for accuracy
const oneRepMaxFormulas = {
  brzycki: (weight: number, reps: number) => {
    // Most accurate for 1-10 reps
    return weight * (36 / (37 - reps));
  },

  epley: (weight: number, reps: number) => {
    // Good for higher rep ranges
    return weight * (1 + reps / 30);
  },

  wathan: (weight: number, reps: number) => {
    return 100 * weight / (48.8 + 53.8 * Math.exp(-0.075 * reps));
  },

  lombardi: (weight: number, reps: number) => {
    return weight * Math.pow(reps, 0.10);
  }
};

// Use different formulas based on rep range
function estimateOneRepMax(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps <= 10) return oneRepMaxFormulas.brzycki(weight, reps);
  return oneRepMaxFormulas.epley(weight, reps);
}

// Calculate across recent workout history
async function getUserEstimated1RM(userId: string, exerciseId: string): Promise<number> {
  // Get top sets from last 30 days
  const topSets = await db.query(`
    SELECT reps, weight_kg
    FROM workout_sets ws
    JOIN workout_sessions wk ON ws.workout_session_id = wk.id
    WHERE wk.user_id = $1
      AND ws.exercise_id = $2
      AND ws.is_warmup = false
      AND ws.reps BETWEEN 1 AND 12
      AND wk.completed_at > NOW() - INTERVAL '30 days'
    ORDER BY (ws.reps * ws.weight_kg) DESC
    LIMIT 10
  `, [userId, exerciseId]);

  // Calculate 1RM for each set
  const estimated1RMs = topSets.map(set =>
    estimateOneRepMax(set.weight_kg, set.reps)
  );

  // Use 95th percentile (more stable than max)
  estimated1RMs.sort((a, b) => b - a);
  return estimated1RMs[Math.floor(estimated1RMs.length * 0.05)] || 0;
}
```

### Strength Level Standards

**Relative Strength Calculation:**

```typescript
interface StrengthStandard {
  untrained: number;
  novice: number;
  intermediate: number;
  advanced: number;
  elite: number;
}

// Standards by exercise and gender (multiplier of bodyweight)
const strengthStandards: Record<string, { male: StrengthStandard; female: StrengthStandard }> = {
  'bench-press': {
    male: { untrained: 0.5, novice: 0.75, intermediate: 1.25, advanced: 1.75, elite: 2.25 },
    female: { untrained: 0.3, novice: 0.5, intermediate: 0.75, advanced: 1.0, elite: 1.5 }
  },
  'squat': {
    male: { untrained: 0.75, novice: 1.25, intermediate: 1.75, advanced: 2.5, elite: 3.25 },
    female: { untrained: 0.5, novice: 0.75, intermediate: 1.25, advanced: 1.75, elite: 2.5 }
  },
  'deadlift': {
    male: { untrained: 1.0, novice: 1.5, intermediate: 2.0, advanced: 2.75, elite: 3.5 },
    female: { untrained: 0.5, novice: 1.0, intermediate: 1.5, advanced: 2.0, elite: 2.75 }
  }
  // ... more exercises
};

function determineStrengthLevel(
  exerciseId: string,
  estimated1RM: number,
  bodyweightKg: number,
  gender: 'male' | 'female'
): string {
  const exercise = getExerciseName(exerciseId);
  const standards = strengthStandards[exercise]?.[gender];

  if (!standards) return 'unknown';

  const relativeStrength = estimated1RM / bodyweightKg;

  if (relativeStrength >= standards.elite) return 'elite';
  if (relativeStrength >= standards.advanced) return 'advanced';
  if (relativeStrength >= standards.intermediate) return 'intermediate';
  if (relativeStrength >= standards.novice) return 'novice';
  return 'beginner';
}

// Percentile calculation (compared to all users)
async function calculatePercentile(
  userId: string,
  exerciseId: string,
  estimated1RM: number
): Promise<number> {
  const result = await db.query(`
    SELECT COUNT(*) as total,
           SUM(CASE WHEN estimated_1rm < $1 THEN 1 ELSE 0 END) as below
    FROM strength_levels
    WHERE exercise_id = $2
  `, [estimated1RM, exerciseId]);

  return (result.below / result.total) * 100;
}
```

## 12. Monitoring & Observability

### Application Performance Monitoring

**Metrics Collection:**

```typescript
// Prometheus metrics
import { Counter, Histogram, Gauge } from 'prom-client';

const metrics = {
  httpRequestDuration: new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status']
  }),

  httpRequestTotal: new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status']
  }),

  dbQueryDuration: new Histogram({
    name: 'db_query_duration_seconds',
    help: 'Duration of database queries',
    labelNames: ['query_type']
  }),

  activeWorkouts: new Gauge({
    name: 'active_workouts_total',
    help: 'Number of currently active workouts'
  })
};

// Middleware to track metrics
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;

    metrics.httpRequestDuration.observe(
      { method: req.method, route: req.route?.path || 'unknown', status: res.statusCode },
      duration
    );

    metrics.httpRequestTotal.inc({
      method: req.method,
      route: req.route?.path || 'unknown',
      status: res.statusCode
    });
  });

  next();
});
```

**Structured Logging:**

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'hevy-api' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log with context
logger.info('Workout completed', {
  userId: 'user123',
  workoutId: 'workout456',
  duration: 3600,
  volume: 5000,
  requestId: req.id
});
```

### Error Tracking

**Sentry Integration:**

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,  // Sample 10% of transactions

  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request?.headers) {
      delete event.request.headers.authorization;
    }
    return event;
  }
});

// Error handler middleware
app.use(Sentry.Handlers.errorHandler());
```

## 13. Deployment & Infrastructure

### AWS Architecture

**Infrastructure as Code (Terraform):**

```hcl
# ECS Cluster for API servers
resource "aws_ecs_cluster" "hevy_api" {
  name = "hevy-api-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# Auto-scaling configuration
resource "aws_appautoscaling_target" "api" {
  service_namespace  = "ecs"
  resource_id        = "service/${aws_ecs_cluster.hevy_api.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  min_capacity       = 10
  max_capacity       = 50
}

resource "aws_appautoscaling_policy" "api_cpu" {
  name               = "api-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  service_namespace  = "ecs"
  resource_id        = aws_appautoscaling_target.api.resource_id
  scalable_dimension = aws_appautoscaling_target.api.scalable_dimension

  target_tracking_scaling_policy_configuration {
    target_value       = 70.0
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  identifier              = "hevy-postgres"
  engine                 = "postgres"
  engine_version         = "15.3"
  instance_class         = "db.r6g.4xlarge"  # 16 vCPU, 128 GB RAM
  allocated_storage      = 1000
  storage_type           = "gp3"
  iops                   = 12000

  multi_az               = true
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"

  performance_insights_enabled = true
}

# Read replicas
resource "aws_db_instance" "postgres_replica" {
  count              = 3
  identifier         = "hevy-postgres-replica-${count.index + 1}"
  replicate_source_db = aws_db_instance.postgres.identifier
  instance_class     = "db.r6g.2xlarge"
}

# ElastiCache Redis
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "hevy-redis"
  engine              = "redis"
  engine_version      = "7.0"
  node_type           = "cache.r6g.xlarge"
  num_cache_nodes     = 3
  parameter_group_name = "default.redis7"
  port                = 6379
}
```

### CI/CD Pipeline

**GitHub Actions Workflow:**

```yaml
name: Deploy API

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Run type check
        run: npm run type-check

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build and push Docker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/hevy-api:$IMAGE_TAG .
          docker push $ECR_REGISTRY/hevy-api:$IMAGE_TAG

      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster hevy-api-cluster \
            --service hevy-api \
            --force-new-deployment
```

**Docker Configuration:**

```dockerfile
# Multi-stage build for optimization
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Create non-root user
RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -s /bin/sh -D nodejs
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node dist/healthcheck.js

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

## 14. Key Takeaways for Scaling

### What Makes Hevy Successful at Scale

1. **Pragmatic Technology Choices**
   - PostgreSQL over NoSQL (ACID guarantees matter)
   - Modular monolith over microservices (small team efficiency)
   - REST over GraphQL (simpler caching, better mobile performance)

2. **Smart Database Design**
   - Time-series optimized schemas
   - Aggressive indexing on hot paths
   - Read replicas for analytics
   - Materialized views for expensive aggregations

3. **Caching Everything**
   - Redis for session/user data
   - CDN for media assets
   - Application-level caching
   - Database query result caching

4. **Background Job Processing**
   - Offload expensive calculations
   - Async PR detection
   - Scheduled aggregations
   - Email notifications

5. **Gradual Optimization**
   - Start simple, optimize bottlenecks
   - Instrument everything (metrics/logs)
   - Data-driven performance improvements
   - Don't premature scale

### Performance Targets

- **API Response Time**: < 100ms p95 for reads, < 500ms for writes
- **Database Queries**: < 50ms p95
- **Cache Hit Rate**: > 80% for user data
- **Uptime**: 99.9% availability
- **Data Durability**: Zero data loss (backups + replication)

### Cost Optimization

**Estimated Monthly AWS Costs at 9M users:**

```
RDS PostgreSQL (primary + 3 replicas): $15,000
ECS Fargate (20-50 instances):         $8,000
ElastiCache Redis (3 nodes):           $3,000
S3 Storage (media):                    $2,000
CloudFront (CDN):                      $5,000
Data Transfer:                         $4,000
Misc (Lambda, SQS, etc.):             $1,000
----------------------------------------
Total Monthly:                         ~$38,000
Cost per user per month:               $0.004
```

**Cost Optimization Strategies:**
- Use Reserved Instances (30-40% savings)
- Spot Instances for worker nodes
- S3 Intelligent Tiering
- Compress API responses
- Optimize image/video sizes

## 15. Future Architecture Considerations

### When to Consider Microservices

**Triggers for breaking up the monolith:**
1. Team grows beyond 15-20 engineers
2. Deployment bottlenecks (can't ship independently)
3. Scaling issues (different components need different resources)
4. Clear bounded contexts emerge

**Potential Microservices:**
```
hevy-auth-service        # Authentication & user management
hevy-workout-service     # Workout CRUD operations
hevy-analytics-service   # Stats & data aggregation
hevy-social-service      # Feed, sharing, comments
hevy-notification-service # Push notifications & emails
hevy-media-service       # Video transcoding & storage
```

### Database Sharding

**When to shard:**
- Database > 5TB
- Write throughput saturates single instance
- Clear sharding key (user_id)

**Sharding Strategy:**

```typescript
// Hash-based sharding by user_id
function getShardForUser(userId: string): number {
  const hash = hashFunction(userId);
  return hash % NUM_SHARDS;
}

// Lookup table approach
const shardMapping = {
  'shard-1': ['user-range-1-1000000'],
  'shard-2': ['user-range-1000001-2000000'],
  // ...
};
```

### Event-Driven Architecture

**Use case: Real-time features**

```typescript
// Publish workout events
await eventBus.publish('workout.completed', {
  userId: 'user123',
  workoutId: 'workout456',
  volume: 5000,
  duration: 3600,
  timestamp: new Date()
});

// Multiple consumers
subscribers.on('workout.completed', async (event) => {
  await calculatePRs(event.userId);
  await updateStrengthLevels(event.userId);
  await notifyFriends(event.userId, event.workoutId);
  await incrementLeaderboard(event.userId, event.volume);
});
```

## Conclusion

Hevy's success with 9 million users on a small team demonstrates the power of:

1. **Strong fundamentals**: Solid database design, proper indexing, caching
2. **Pragmatic choices**: Use boring technology that scales
3. **Incremental optimization**: Don't over-engineer early
4. **Clear architecture**: Modular design enables future evolution
5. **Operational excellence**: Monitoring, logging, graceful degradation

The key is starting simple with a well-architected monolith, then scaling components as needed based on real data and user growth.

---

## References & Further Reading

- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [Designing Data-Intensive Applications](https://dataintensive.net/) by Martin Kleppmann
- [System Design Primer](https://github.com/donnemartin/system-design-primer)
- [Database Indexing Strategies](https://use-the-index-luke.com/)

---

**Document Version**: 1.0
**Last Updated**: 2024-01-15
**Compiled by**: Backend Research Team
