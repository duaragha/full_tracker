# Fitness API Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Applications                          │
├─────────────┬──────────────┬──────────────┬─────────────────────────┤
│  Next.js    │  Wear OS     │ React Native │  Health Connect         │
│  Web App    │  Watch App   │  Mobile App  │  (Android)              │
└──────┬──────┴──────┬───────┴──────┬───────┴─────────┬───────────────┘
       │             │              │                 │
       │ HTTP/WS     │ HTTP         │ HTTP            │ Webhook
       │             │              │                 │
       ▼             ▼              ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        API Gateway / Load Balancer                   │
│                     (Rate Limiting, SSL/TLS)                         │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Next.js API Routes                           │
│                        /api/v1/* endpoints                           │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Auth         │  │ Workouts     │  │ Exercises    │              │
│  │ Middleware   │  │ Routes       │  │ Routes       │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                        │
│  ┌──────▼──────────────────▼─────────────────▼──────┐              │
│  │         Business Logic Layer                      │              │
│  │  (Validation, Authorization, Rate Limiting)       │              │
│  └──────┬───────────────────┬───────────────┬────────┘              │
│         │                   │               │                        │
│  ┌──────▼───────┐  ┌────────▼───────┐  ┌────▼──────────┐           │
│  │ Workout      │  │ Exercise       │  │ Health        │           │
│  │ Service      │  │ Service        │  │ Service       │           │
│  └──────┬───────┘  └────────┬───────┘  └────┬──────────┘           │
└─────────┼──────────────────┼────────────────┼─────────────────────┘
          │                  │                │
          ▼                  ▼                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Data Access Layer                                │
│                  (PostgreSQL Queries)                                │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                               │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐          │
│  │exercises │  │workouts  │  │routines  │  │health_     │          │
│  │          │  │          │  │          │  │metrics     │          │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐          │
│  │workout_  │  │workout_  │  │body_     │  │sync_       │          │
│  │exercises │  │sets      │  │measure   │  │tokens      │          │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘          │
└─────────────────────────────────────────────────────────────────────┘

                                 ▲
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
        ┌────────▼────────┐           ┌──────────▼─────────┐
        │  WebSocket      │           │  Background Jobs   │
        │  Server         │           │  (Sync, Cleanup)   │
        │  (Real-time)    │           └────────────────────┘
        └─────────────────┘
```

## Data Flow Diagrams

### 1. Workout Creation Flow

```
┌─────────┐
│ Client  │
└────┬────┘
     │ 1. POST /api/v1/workouts
     │    {title, started_at, ...}
     ▼
┌─────────────────┐
│  API Endpoint   │ 2. Validate request
│  (POST handler) │    Check authentication
└────┬────────────┘    Check rate limits
     │
     │ 3. Create workout
     ▼
┌─────────────────┐
│ Workout Service │ 4. Business logic
│                 │    Generate UUID
└────┬────────────┘    Set defaults
     │
     │ 5. INSERT INTO workouts
     ▼
┌─────────────────┐
│   PostgreSQL    │ 6. Store workout
│                 │    Return new record
└────┬────────────┘
     │
     │ 7. Workout created
     ▼
┌─────────────────┐
│  API Response   │ 8. 201 Created
│                 │    {data: workout, meta: {...}}
└────┬────────────┘
     │
     │ 9. Response with Location header
     ▼
┌─────────┐
│ Client  │ 10. Store workout ID
└─────────┘     Navigate to workout screen
```

### 2. Real-time Set Completion Flow

```
┌─────────┐                                    ┌─────────┐
│ Client  │                                    │  Server │
└────┬────┘                                    └────┬────┘
     │                                              │
     │ 1. WebSocket connect                         │
     │─────────────────────────────────────────────>│
     │                                              │
     │ 2. Send auth token                           │
     │─────────────────────────────────────────────>│
     │                                              │ 3. Verify token
     │                                              │    Associate user
     │ 4. Auth success                              │
     │<─────────────────────────────────────────────│
     │                                              │
     │ 5. Complete set event                        │
     │    {type: 'set.completed', payload: {...}}   │
     │─────────────────────────────────────────────>│
     │                                              │ 6. Update database
     │                                              │    UPDATE workout_sets
     │                                              │
     │                                              │ 7. Calculate metrics
     │                                              │    SUM volume, reps
     │ 8. Acknowledgment                            │
     │<─────────────────────────────────────────────│
     │    {type: 'ack', status: 'success'}          │
     │                                              │
     │ 9. Stats update                              │
     │<─────────────────────────────────────────────│
     │    {type: 'workout.stats', payload: {...}}   │
     │                                              │
     │ 10. Update UI                                │
     │     Show new stats                           │
     │                                              │
```

### 3. Offline Sync Flow (Wearable)

```
┌───────────────┐
│  Wear OS App  │ 1. User completes workout offline
└───────┬───────┘    Store locally with client_id
        │
        │ 2. Network available
        │    Queue workouts for sync
        ▼
┌───────────────┐
│  Sync Service │ 3. Batch workouts
└───────┬───────┘    Add device_id, timestamps
        │
        │ 4. POST /api/v1/workouts/batch
        │    Idempotency-Key: device_id_timestamp
        ▼
┌───────────────┐
│  API Server   │ 5. Process each workout
└───────┬───────┘    Check for duplicates (client_id)
        │            Create new or return existing
        │
        │ 6. Return 207 Multi-Status
        │    results: [{client_id, server_id, status}]
        ▼
┌───────────────┐
│  Sync Service │ 7. Map client IDs to server IDs
└───────┬───────┘    Update local database
        │            Mark as synced
        │
        │ 8. Sync complete
        ▼
┌───────────────┐
│  Wear OS App  │ 9. Show sync success
└───────────────┘    Remove local-only flag
```

### 4. Health Connect Integration Flow

```
┌──────────────┐                    ┌──────────────┐
│ Health       │                    │ Your Wear OS │
│ Connect      │                    │ App          │
└──────┬───────┘                    └──────┬───────┘
       │                                   │
       │ 1. User completes workout         │
       │    in third-party app             │
       │                                   │
       │ 2. Workout saved to               │
       │    Health Connect                 │
       │                                   │
       │ 3. Your app observes changes      │
       │<──────────────────────────────────│
       │                                   │
       │                                   │ 4. Read ExerciseSession
       │                                   │    Convert to API format
       │                                   │
       │                                   │ 5. POST /api/v1/workouts
       │                                   │    sync_source: health_connect
       │                                   ▼
       │                            ┌──────────────┐
       │                            │ API Server   │
       │                            └──────┬───────┘
       │                                   │
       │                                   │ 6. Store workout
       │                                   │
       │                                   │ 7. Trigger webhook
       │                                   ▼
       │                            ┌──────────────┐
       │                            │ Webhook      │
       │                            │ Handler      │
       │                            └──────┬───────┘
       │                                   │
       │                                   │ 8. Notify web app
       │                                   │    New workout available
       │                                   ▼
       │                            ┌──────────────┐
       │                            │ Next.js      │
       │                            │ Web App      │
       │                            └──────────────┘
```

## Database Schema Overview

### Core Tables

```
┌─────────────┐
│  exercises  │ Exercise library (pre-defined + custom)
├─────────────┤
│ id          │ UUID (PK)
│ name        │ TEXT
│ category    │ TEXT (strength, cardio, etc.)
│ muscle_grps │ TEXT[]
│ equipment   │ TEXT[]
│ difficulty  │ TEXT
│ is_custom   │ BOOLEAN
│ created_by  │ UUID (FK users)
└─────────────┘
       ▲
       │ references
       │
┌──────┴────────────┐
│ workout_routines  │ Workout templates
├───────────────────┤
│ id                │ UUID (PK)
│ user_id           │ UUID (FK users)
│ name              │ TEXT
│ exercises         │ → routine_exercises
└───────────────────┘
       ▲
       │ references (optional)
       │
┌──────┴──────┐
│  workouts   │ Workout sessions
├─────────────┤
│ id          │ UUID (PK)
│ user_id     │ UUID (FK users)
│ routine_id  │ UUID (FK workout_routines, optional)
│ title       │ TEXT
│ status      │ TEXT (planned, in_progress, completed)
│ started_at  │ TIMESTAMPTZ
│ completed_at│ TIMESTAMPTZ
│ metrics     │ Calculated fields (volume, reps, sets)
│ sync_source │ TEXT (web, wear_os, health_connect)
│ device_id   │ TEXT
│ client_id   │ TEXT (for offline sync)
└─────────────┘
       ▲
       │ has many
       │
┌──────┴────────────┐
│ workout_exercises │ Exercises in workout
├───────────────────┤
│ id                │ UUID (PK)
│ workout_id        │ UUID (FK workouts)
│ exercise_id       │ UUID (FK exercises)
│ order_position    │ INTEGER
│ exercise_name     │ TEXT (denormalized)
└───────────────────┘
       ▲
       │ has many
       │
┌──────┴────────┐
│ workout_sets  │ Individual sets
├───────────────┤
│ id            │ UUID (PK)
│ workout_ex_id │ UUID (FK workout_exercises)
│ set_number    │ INTEGER
│ set_type      │ TEXT (normal, warmup, drop_set)
│ target_reps   │ INTEGER
│ actual_reps   │ INTEGER
│ target_weight │ DECIMAL
│ actual_weight │ DECIMAL
│ rpe           │ INTEGER (1-10)
│ completed     │ BOOLEAN
└───────────────┘

┌──────────────────┐
│ health_metrics   │ Health data (HR, steps, etc.)
├──────────────────┤
│ id               │ UUID (PK)
│ user_id          │ UUID (FK users)
│ metric_type      │ TEXT (heart_rate, steps, etc.)
│ value            │ DECIMAL
│ unit             │ TEXT (bpm, count, etc.)
│ recorded_at      │ TIMESTAMPTZ
│ source           │ TEXT (wear_os, health_connect)
└──────────────────┘

┌──────────────────┐
│ body_measurements│ Body tracking
├──────────────────┤
│ id               │ UUID (PK)
│ user_id          │ UUID (FK users)
│ measured_at      │ TIMESTAMPTZ
│ weight_kg        │ DECIMAL
│ body_fat_pct     │ DECIMAL
│ measurements     │ JSONB {chest_cm, waist_cm, etc.}
└──────────────────┘
```

### Supporting Tables

```
┌────────────┐
│  webhooks  │ Webhook subscriptions
├────────────┤
│ id         │ UUID (PK)
│ user_id    │ UUID (FK users)
│ url        │ TEXT
│ events     │ TEXT[]
│ secret     │ TEXT
│ active     │ BOOLEAN
└────────────┘

┌──────────────┐
│ sync_tokens  │ Delta sync tracking
├──────────────┤
│ id           │ UUID (PK)
│ user_id      │ UUID (FK users)
│ device_id    │ TEXT
│ token        │ TEXT (unique)
│ last_sync_at │ TIMESTAMPTZ
└──────────────┘

┌────────────┐
│ api_keys   │ API key management
├────────────┤
│ id         │ UUID (PK)
│ user_id    │ UUID (FK users)
│ key_hash   │ TEXT (unique)
│ key_prefix │ TEXT
│ scopes     │ TEXT[]
│ expires_at │ TIMESTAMPTZ
└────────────┘

┌──────────────┐
│ rate_limits  │ Rate limiting tracking
├──────────────┤
│ id           │ UUID (PK)
│ user_id      │ UUID (FK users)
│ endpoint     │ TEXT
│ requests     │ INTEGER
│ window_start │ TIMESTAMPTZ
└──────────────┘
```

## API Endpoint Structure

```
/api/v1/
├── auth/
│   ├── token (POST) - Get access token
│   └── refresh (POST) - Refresh token
│
├── exercises/
│   ├── (GET) - List exercises
│   ├── (POST) - Create exercise
│   ├── /:id (GET) - Get exercise
│   ├── /:id (PATCH) - Update exercise
│   └── /:id (DELETE) - Delete exercise
│
├── workouts/
│   ├── (GET) - List workouts
│   ├── (POST) - Create workout
│   ├── /batch (POST) - Batch create workouts
│   ├── /:id (GET) - Get workout
│   ├── /:id (PATCH) - Update workout
│   ├── /:id (DELETE) - Delete workout
│   ├── /:id/live (WebSocket) - Real-time workout
│   ├── /:id/exercises (POST) - Add exercise to workout
│   ├── /:id/exercises/:exId (PATCH) - Update exercise
│   ├── /:id/exercises/:exId (DELETE) - Remove exercise
│   ├── /:id/exercises/:exId/sets/:setId (PATCH) - Update set
│   └── /:id/exercises/:exId/sets/batch (PATCH) - Batch update sets
│
├── routines/
│   ├── (GET) - List routines
│   ├── (POST) - Create routine
│   ├── /:id (GET) - Get routine
│   ├── /:id (PATCH) - Update routine
│   ├── /:id (DELETE) - Delete routine
│   └── /:id/start (POST) - Start workout from routine
│
├── health/
│   ├── metrics (GET) - List health metrics
│   ├── metrics (POST) - Create health metric
│   └── metrics/batch (POST) - Batch create metrics
│
├── measurements/
│   ├── (GET) - List body measurements
│   └── (POST) - Create measurement
│
├── sync/
│   ├── workouts (POST) - Bidirectional sync
│   └── changes (GET) - Get delta changes
│
└── webhooks/
    ├── (GET) - List webhooks
    ├── (POST) - Create webhook
    ├── /:id (GET) - Get webhook
    ├── /:id (PATCH) - Update webhook
    └── /:id (DELETE) - Delete webhook
```

## Technology Stack

### Backend
- **Framework**: Next.js 16 (App Router)
- **API Routes**: `/app/api/v1/*`
- **Database**: PostgreSQL 14+
- **ORM**: Raw SQL with `pg` driver
- **Validation**: Zod
- **Authentication**: OAuth 2.0, JWT, API Keys
- **WebSocket**: `ws` library
- **Rate Limiting**: PostgreSQL-based

### Frontend (Web)
- **Framework**: Next.js 16 + React 19
- **UI**: Tailwind CSS + Radix UI
- **State**: React hooks + Context
- **Real-time**: WebSocket client
- **Forms**: React Hook Form + Zod

### Mobile (Wear OS)
- **Language**: Kotlin
- **Framework**: Jetpack Compose for Wear OS
- **Health**: Health Connect SDK
- **Network**: Retrofit + OkHttp
- **Offline**: Room Database
- **Sync**: WorkManager

### Infrastructure
- **Hosting**: Vercel / Railway
- **Database**: Vercel Postgres / Railway
- **CDN**: Vercel Edge Network
- **Monitoring**: Vercel Analytics
- **Logging**: Structured JSON logs

## Security Architecture

### Authentication Flow

```
┌─────────┐                           ┌─────────┐
│ Client  │                           │  Auth   │
│         │                           │ Server  │
└────┬────┘                           └────┬────┘
     │                                     │
     │ 1. Request authorization            │
     │────────────────────────────────────>│
     │                                     │
     │                                     │ 2. User login
     │                                     │    & approve
     │ 3. Authorization code               │
     │<────────────────────────────────────│
     │                                     │
     │ 4. Exchange code for token          │
     │────────────────────────────────────>│
     │                                     │
     │                                     │ 5. Verify client
     │                                     │    Generate tokens
     │ 6. Access + Refresh tokens          │
     │<────────────────────────────────────│
     │                                     │
     ▼                                     │
┌─────────┐                               │
│  Store  │                               │
│ Tokens  │                               │
└────┬────┘                               │
     │                                     │
     │ 7. API request with access token    │
     ▼────────────────────────────────────▼
┌─────────────────────────────────────────┐
│         API Server                       │
│  • Verify JWT signature                 │
│  • Check expiration                     │
│  • Extract user ID & scopes             │
│  • Authorize request                    │
└─────────────────────────────────────────┘
```

### Rate Limiting Strategy

```
Token Bucket Algorithm
─────────────────────

Bucket: 100 tokens
Refill: 100 tokens/hour
Request: -1 token

┌─────────────────────┐
│  [••••••••••]       │ 100 tokens (full)
└─────────────────────┘
       │
       │ Request 1 (-1 token)
       ▼
┌─────────────────────┐
│  [•••••••••]        │ 99 tokens
└─────────────────────┘
       │
       │ ... 99 more requests
       ▼
┌─────────────────────┐
│  []                 │ 0 tokens (rate limited)
└─────────────────────┘
       │
       │ Wait 1 hour
       ▼
┌─────────────────────┐
│  [••••••••••]       │ 100 tokens (refilled)
└─────────────────────┘
```

## Performance Considerations

### Caching Strategy

```
┌─────────┐
│ Client  │
└────┬────┘
     │ GET /exercises
     ▼
┌─────────────────┐
│  CDN Cache      │ Cache-Control: public, max-age=3600
│  (Edge)         │ Hit? → Return cached response
└────┬────────────┘
     │ Miss
     ▼
┌─────────────────┐
│  API Server     │ ETag: "version_123"
│  Cache          │ Hit? → 304 Not Modified
└────┬────────────┘
     │ Miss
     ▼
┌─────────────────┐
│  PostgreSQL     │ Query with indexes
│                 │ Return fresh data
└─────────────────┘
```

### Database Optimization

- **Indexes**: All foreign keys, status fields, date ranges
- **Materialized Views**: Pre-calculated statistics
- **Connection Pooling**: Max 20 connections
- **Query Optimization**: Use EXPLAIN ANALYZE
- **Partitioning**: Consider for large health_metrics table

## Scalability

### Horizontal Scaling

```
┌───────────────────────────────────────────────┐
│         Load Balancer (Round Robin)           │
└─────┬─────────┬─────────┬─────────┬───────────┘
      │         │         │         │
      ▼         ▼         ▼         ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Next.js  │ │ Next.js  │ │ Next.js  │ │ Next.js  │
│ Instance │ │ Instance │ │ Instance │ │ Instance │
│    #1    │ │    #2    │ │    #3    │ │    #4    │
└────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
     │            │            │            │
     └────────────┴────────────┴────────────┘
                  │
                  ▼
        ┌─────────────────┐
        │   PostgreSQL    │ Read replicas
        │   (Primary)     │ for scalability
        └─────────────────┘
```

## Monitoring & Observability

### Metrics to Track

1. **API Metrics**
   - Request rate (req/s)
   - Response time (p50, p95, p99)
   - Error rate (%)
   - Status code distribution

2. **Database Metrics**
   - Query time
   - Connection pool usage
   - Slow queries
   - Lock contention

3. **Business Metrics**
   - Workouts created/day
   - Active users
   - Sync success rate
   - WebSocket connections

4. **Infrastructure Metrics**
   - CPU usage
   - Memory usage
   - Network I/O
   - Disk I/O

## Deployment Strategy

### CI/CD Pipeline

```
┌──────────┐
│   Git    │
│  Commit  │
└────┬─────┘
     │
     ▼
┌──────────────┐
│   GitHub     │ Push to main
│   Actions    │
└────┬─────────┘
     │
     ├─> Run tests
     ├─> Lint code
     ├─> Build
     │
     ▼
┌──────────────┐
│   Staging    │ Auto-deploy
│  Environment │ Run integration tests
└────┬─────────┘
     │
     │ Manual approval
     ▼
┌──────────────┐
│  Production  │ Zero-downtime deployment
│  Environment │ Health checks
└──────────────┘
```

## Documentation Generated

Total: **6,783 lines** of comprehensive documentation

1. **fitness-api-design.md** (1,630 lines)
   - Complete API architecture
   - Authentication strategies
   - Resource models
   - Real-time features

2. **openapi-fitness.yaml** (1,936 lines)
   - OpenAPI 3.1 specification
   - All endpoints documented
   - Request/response schemas
   - Machine-readable format

3. **implementation-guide.md** (1,310 lines)
   - Database migrations
   - Next.js implementation
   - WebSocket setup
   - Client SDKs

4. **quick-reference.md** (684 lines)
   - Quick start guide
   - Request examples
   - Error handling
   - Best practices

5. **health-connect-integration.md** (641 lines)
   - Health Connect mapping
   - Integration flows
   - Webhook setup
   - Sync strategies

6. **README.md** (582 lines)
   - Overview and navigation
   - Quick start
   - Implementation phases
   - Support resources

## Next Steps

1. Review documentation with team
2. Set up development environment
3. Run database migrations
4. Implement core API endpoints
5. Build client SDKs
6. Develop Wear OS app
7. Test and deploy

---

**Created**: 2025-11-14
**Version**: 1.0
**Status**: Ready for implementation
