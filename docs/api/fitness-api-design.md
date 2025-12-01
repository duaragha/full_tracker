# Fitness Tracking API Architecture

## Overview

This document defines a RESTful API architecture for fitness tracking features designed to support:
- Next.js web application with server actions
- Future Wear OS application
- Health Connect integration
- Potential React Native mobile app
- Real-time workout tracking
- Efficient wearable data synchronization

## Design Principles

1. **API-First Design**: Design API contracts before implementation
2. **Resource-Oriented**: RESTful resource modeling with clear hierarchies
3. **Idempotent Operations**: Safe retry logic for mobile/wearable sync
4. **Batch Support**: Efficient bulk operations for offline-first wearables
5. **Real-time Capable**: WebSocket/SSE for live workout sessions
6. **Backward Compatible**: Versioned API with graceful deprecation
7. **Cross-Platform**: Consistent data formats across web, mobile, wearables

## Base URL Structure

```
Production:  https://api.fulltracker.app/v1
Development: http://localhost:3000/api/v1
```

## API Versioning Strategy

### Version Format
- URI versioning: `/api/v1`, `/api/v2`
- Header versioning for minor changes: `X-API-Version: 1.2`

### Version Support Policy
- Current version: Full support with new features
- Previous version: Maintenance mode (6 months)
- Deprecated versions: 3-month sunset notice

### Migration Path
- Parallel version support during transition
- Feature flags for gradual rollout
- Client SDK auto-upgrade support

## Authentication & Authorization

### Authentication Methods

#### 1. OAuth 2.0 (Recommended for Mobile/Wearable Apps)
```http
POST /api/v1/auth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "AUTH_CODE",
  "client_id": "wear_os_app",
  "client_secret": "CLIENT_SECRET",
  "redirect_uri": "https://app.fulltracker.app/callback"
}

Response:
{
  "access_token": "eyJhbGc...",
  "refresh_token": "rt_AbC123...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "workouts:read workouts:write exercises:read"
}
```

#### 2. API Keys (Server-to-Server)
```http
Authorization: Bearer sk_live_abc123...
X-API-Key: sk_live_abc123...
```

#### 3. Session-based (Web App)
- HttpOnly cookies for web application
- CSRF protection via double-submit cookies

### Token Refresh Flow
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "rt_AbC123...",
  "client_id": "wear_os_app"
}
```

### Permission Scopes
```
workouts:read          - Read workout data
workouts:write         - Create/update workouts
workouts:delete        - Delete workout data
exercises:read         - Read exercise library
exercises:write        - Create custom exercises
routines:read          - Read workout routines
routines:write         - Create/update routines
health:read            - Read health metrics
health:write           - Sync health data
profile:read           - Read user profile
profile:write          - Update user profile
```

### Security Headers
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

## Core Resources

### 1. Exercises (Exercise Library)

Base endpoint: `/api/v1/exercises`

```typescript
interface Exercise {
  id: string;                    // UUID
  name: string;
  description: string;
  category: ExerciseCategory;
  muscle_groups: MuscleGroup[];
  equipment: Equipment[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instructions: string[];
  video_url?: string;
  thumbnail_url?: string;
  is_custom: boolean;            // User-created exercise
  created_by?: string;           // User ID if custom
  metadata: {
    calories_per_rep?: number;
    mets_value?: number;         // Metabolic Equivalent of Task
  };
  created_at: string;            // ISO 8601
  updated_at: string;
}

type ExerciseCategory =
  | 'strength'
  | 'cardio'
  | 'flexibility'
  | 'balance'
  | 'plyometric'
  | 'olympic_lifting'
  | 'powerlifting'
  | 'bodyweight'
  | 'functional';

type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'core'
  | 'quadriceps'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'full_body';

type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'kettlebell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'bands'
  | 'medicine_ball'
  | 'none';
```

### 2. Workouts (Workout Sessions)

Base endpoint: `/api/v1/workouts`

```typescript
interface Workout {
  id: string;                    // UUID
  user_id: string;
  title: string;
  description?: string;
  routine_id?: string;           // Reference to template routine
  status: WorkoutStatus;
  started_at: string;            // ISO 8601
  completed_at?: string;
  duration_seconds?: number;     // Calculated duration
  exercises: WorkoutExercise[];
  notes?: string;
  location?: {
    type: 'gym' | 'home' | 'outdoor';
    name?: string;
  };
  metrics: {
    total_volume: number;        // Total weight * reps
    total_reps: number;
    total_sets: number;
    calories_burned?: number;
    average_heart_rate?: number;
    max_heart_rate?: number;
  };
  sync_metadata?: {
    source: 'web' | 'wear_os' | 'health_connect' | 'ios';
    device_id?: string;
    synced_at: string;
  };
  created_at: string;
  updated_at: string;
}

type WorkoutStatus =
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

interface WorkoutExercise {
  id: string;                    // UUID
  exercise_id: string;           // Reference to exercise
  exercise_name: string;         // Denormalized for display
  order: number;                 // Position in workout
  sets: Set[];
  notes?: string;
  superset_group?: string;       // Group exercises performed together
}
```

### 3. Sets (Individual Exercise Sets)

```typescript
interface Set {
  id: string;                    // UUID
  workout_exercise_id: string;
  set_number: number;
  set_type: SetType;
  target_reps?: number;          // Planned reps
  actual_reps?: number;          // Performed reps
  target_weight?: number;        // Planned weight (kg)
  actual_weight?: number;        // Performed weight (kg)
  target_duration_seconds?: number;  // For timed exercises
  actual_duration_seconds?: number;
  target_distance_meters?: number;   // For cardio
  actual_distance_meters?: number;
  rpe?: number;                  // Rate of Perceived Exertion (1-10)
  rest_seconds?: number;
  completed: boolean;
  completed_at?: string;         // ISO 8601
  notes?: string;
}

type SetType =
  | 'normal'
  | 'warmup'
  | 'drop_set'
  | 'superset'
  | 'rest_pause'
  | 'failure'
  | 'amrap';                     // As Many Reps As Possible
```

### 4. Routines (Workout Templates)

Base endpoint: `/api/v1/routines`

```typescript
interface Routine {
  id: string;                    // UUID
  user_id: string;
  name: string;
  description?: string;
  category?: string;             // 'push', 'pull', 'legs', etc.
  is_public: boolean;            // Share with other users
  exercises: RoutineExercise[];
  schedule?: {
    frequency: 'daily' | 'weekly' | 'custom';
    days?: string[];             // ['monday', 'wednesday', 'friday']
  };
  estimated_duration_minutes?: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  created_at: string;
  updated_at: string;
  last_used_at?: string;
  use_count: number;
}

interface RoutineExercise {
  exercise_id: string;
  exercise_name: string;         // Denormalized
  order: number;
  target_sets: number;
  target_reps?: number;
  target_weight?: number;
  rest_seconds?: number;
  notes?: string;
  superset_group?: string;
}
```

### 5. Body Measurements

Base endpoint: `/api/v1/measurements`

```typescript
interface BodyMeasurement {
  id: string;
  user_id: string;
  measured_at: string;           // ISO 8601
  weight_kg?: number;
  body_fat_percentage?: number;
  muscle_mass_kg?: number;
  measurements?: {
    chest_cm?: number;
    waist_cm?: number;
    hips_cm?: number;
    bicep_left_cm?: number;
    bicep_right_cm?: number;
    thigh_left_cm?: number;
    thigh_right_cm?: number;
    calf_left_cm?: number;
    calf_right_cm?: number;
  };
  notes?: string;
  source?: 'manual' | 'smart_scale' | 'health_connect';
  created_at: string;
}
```

### 6. Health Metrics (Heart Rate, Sleep, Steps)

Base endpoint: `/api/v1/health/metrics`

```typescript
interface HealthMetric {
  id: string;
  user_id: string;
  metric_type: MetricType;
  value: number;
  unit: string;
  recorded_at: string;           // ISO 8601
  source: 'wear_os' | 'health_connect' | 'manual' | 'apple_health';
  device_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

type MetricType =
  | 'heart_rate'
  | 'steps'
  | 'distance'
  | 'calories_burned'
  | 'sleep_duration'
  | 'resting_heart_rate'
  | 'vo2_max'
  | 'blood_pressure_systolic'
  | 'blood_pressure_diastolic';
```

## API Endpoints

### Exercises

#### List Exercises
```http
GET /api/v1/exercises
Authorization: Bearer {token}

Query Parameters:
  - category: string (filter by category)
  - muscle_group: string (filter by muscle group)
  - equipment: string (filter by equipment)
  - difficulty: string (filter by difficulty)
  - is_custom: boolean (show only custom exercises)
  - search: string (search by name/description)
  - page: number (default: 1)
  - limit: number (default: 50, max: 100)
  - sort: string (name, created_at, -name, -created_at)

Response: 200 OK
{
  "data": [Exercise],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 245,
    "total_pages": 5,
    "has_next": true,
    "has_prev": false
  },
  "meta": {
    "api_version": "1.0",
    "request_id": "req_abc123"
  }
}
```

#### Get Exercise
```http
GET /api/v1/exercises/{exercise_id}
Authorization: Bearer {token}

Response: 200 OK
{
  "data": Exercise,
  "meta": {
    "api_version": "1.0",
    "request_id": "req_abc123"
  }
}
```

#### Create Custom Exercise
```http
POST /api/v1/exercises
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Bulgarian Split Squat",
  "description": "Single leg squat with rear foot elevated",
  "category": "strength",
  "muscle_groups": ["quadriceps", "glutes"],
  "equipment": ["dumbbell"],
  "difficulty": "intermediate",
  "instructions": [
    "Place rear foot on elevated surface",
    "Lower down into squat position",
    "Push through front heel to return"
  ]
}

Response: 201 Created
Location: /api/v1/exercises/{exercise_id}
{
  "data": Exercise,
  "meta": {
    "api_version": "1.0",
    "request_id": "req_abc123"
  }
}
```

### Workouts

#### List Workouts
```http
GET /api/v1/workouts
Authorization: Bearer {token}

Query Parameters:
  - status: string (filter by status)
  - from_date: string (ISO 8601 date)
  - to_date: string (ISO 8601 date)
  - routine_id: string (filter by routine)
  - page: number (default: 1)
  - limit: number (default: 20, max: 100)
  - sort: string (started_at, -started_at, created_at, -created_at)
  - include: string (comma-separated: exercises, routine, metrics)

Response: 200 OK
{
  "data": [Workout],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  },
  "meta": {
    "api_version": "1.0",
    "request_id": "req_abc123"
  }
}
```

#### Get Workout
```http
GET /api/v1/workouts/{workout_id}
Authorization: Bearer {token}

Query Parameters:
  - include: string (comma-separated: exercises, routine, metrics)

Response: 200 OK
{
  "data": Workout,
  "meta": {
    "api_version": "1.0",
    "request_id": "req_abc123"
  }
}
```

#### Create Workout (Start Session)
```http
POST /api/v1/workouts
Authorization: Bearer {token}
Content-Type: application/json
Idempotency-Key: idempotent_key_123

{
  "title": "Chest & Triceps",
  "routine_id": "routine_123",
  "started_at": "2025-11-14T10:30:00Z",
  "status": "in_progress",
  "location": {
    "type": "gym",
    "name": "LA Fitness"
  }
}

Response: 201 Created
Location: /api/v1/workouts/{workout_id}
{
  "data": Workout,
  "meta": {
    "api_version": "1.0",
    "request_id": "req_abc123"
  }
}
```

#### Update Workout
```http
PATCH /api/v1/workouts/{workout_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "completed",
  "completed_at": "2025-11-14T11:45:00Z",
  "notes": "Great workout, felt strong"
}

Response: 200 OK
{
  "data": Workout,
  "meta": {
    "api_version": "1.0",
    "request_id": "req_abc123"
  }
}
```

#### Delete Workout
```http
DELETE /api/v1/workouts/{workout_id}
Authorization: Bearer {token}

Response: 204 No Content
```

#### Batch Create Workouts (Wearable Sync)
```http
POST /api/v1/workouts/batch
Authorization: Bearer {token}
Content-Type: application/json
Idempotency-Key: batch_sync_abc123

{
  "workouts": [
    {
      "client_id": "local_workout_1",  // Client-side ID for reference
      "title": "Morning Run",
      "started_at": "2025-11-14T06:00:00Z",
      "completed_at": "2025-11-14T06:45:00Z",
      "status": "completed",
      "exercises": [...],
      "sync_metadata": {
        "source": "wear_os",
        "device_id": "watch_123"
      }
    },
    // ... more workouts
  ]
}

Response: 207 Multi-Status
{
  "results": [
    {
      "client_id": "local_workout_1",
      "status": "created",
      "data": Workout
    },
    {
      "client_id": "local_workout_2",
      "status": "error",
      "error": {
        "code": "validation_error",
        "message": "Invalid exercise_id"
      }
    }
  ],
  "summary": {
    "total": 10,
    "created": 8,
    "updated": 0,
    "failed": 2
  },
  "meta": {
    "api_version": "1.0",
    "request_id": "req_abc123"
  }
}
```

### Workout Exercises

#### Add Exercise to Workout
```http
POST /api/v1/workouts/{workout_id}/exercises
Authorization: Bearer {token}
Content-Type: application/json

{
  "exercise_id": "exercise_123",
  "order": 1,
  "sets": [
    {
      "set_number": 1,
      "set_type": "warmup",
      "target_reps": 12,
      "target_weight": 60
    },
    {
      "set_number": 2,
      "set_type": "normal",
      "target_reps": 8,
      "target_weight": 80
    }
  ]
}

Response: 201 Created
{
  "data": WorkoutExercise,
  "meta": {
    "api_version": "1.0",
    "request_id": "req_abc123"
  }
}
```

#### Update Workout Exercise
```http
PATCH /api/v1/workouts/{workout_id}/exercises/{exercise_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "notes": "Form felt great today"
}

Response: 200 OK
{
  "data": WorkoutExercise,
  "meta": {
    "api_version": "1.0",
    "request_id": "req_abc123"
  }
}
```

### Sets

#### Complete Set
```http
PATCH /api/v1/workouts/{workout_id}/exercises/{exercise_id}/sets/{set_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "actual_reps": 8,
  "actual_weight": 80,
  "rpe": 7,
  "completed": true,
  "completed_at": "2025-11-14T10:45:00Z"
}

Response: 200 OK
{
  "data": Set,
  "meta": {
    "api_version": "1.0",
    "request_id": "req_abc123"
  }
}
```

#### Batch Update Sets
```http
PATCH /api/v1/workouts/{workout_id}/exercises/{exercise_id}/sets/batch
Authorization: Bearer {token}
Content-Type: application/json

{
  "sets": [
    {
      "id": "set_1",
      "actual_reps": 8,
      "actual_weight": 80,
      "completed": true
    },
    {
      "id": "set_2",
      "actual_reps": 7,
      "actual_weight": 80,
      "completed": true
    }
  ]
}

Response: 200 OK
{
  "data": [Set],
  "meta": {
    "api_version": "1.0",
    "request_id": "req_abc123"
  }
}
```

### Routines

#### List Routines
```http
GET /api/v1/routines
Authorization: Bearer {token}

Query Parameters:
  - is_public: boolean
  - category: string
  - difficulty: string
  - search: string
  - page: number
  - limit: number
  - sort: string

Response: 200 OK
{
  "data": [Routine],
  "pagination": {...},
  "meta": {...}
}
```

#### Create Routine
```http
POST /api/v1/routines
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Push Day A",
  "description": "Chest, shoulders, and triceps focus",
  "category": "push",
  "difficulty": "intermediate",
  "exercises": [
    {
      "exercise_id": "exercise_123",
      "order": 1,
      "target_sets": 3,
      "target_reps": 8,
      "rest_seconds": 120
    }
  ]
}

Response: 201 Created
{
  "data": Routine,
  "meta": {...}
}
```

#### Start Workout from Routine
```http
POST /api/v1/routines/{routine_id}/start
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Push Day A - Nov 14",
  "started_at": "2025-11-14T10:00:00Z"
}

Response: 201 Created
Location: /api/v1/workouts/{workout_id}
{
  "data": Workout,  // Pre-populated with routine exercises
  "meta": {...}
}
```

### Health Metrics

#### List Metrics
```http
GET /api/v1/health/metrics
Authorization: Bearer {token}

Query Parameters:
  - metric_type: string
  - from_date: string (ISO 8601)
  - to_date: string (ISO 8601)
  - source: string
  - aggregation: string (none, hourly, daily, weekly)
  - page: number
  - limit: number

Response: 200 OK
{
  "data": [HealthMetric],
  "pagination": {...},
  "meta": {...}
}
```

#### Batch Create Metrics (Health Connect Sync)
```http
POST /api/v1/health/metrics/batch
Authorization: Bearer {token}
Content-Type: application/json

{
  "metrics": [
    {
      "metric_type": "heart_rate",
      "value": 145,
      "unit": "bpm",
      "recorded_at": "2025-11-14T10:30:00Z",
      "source": "wear_os"
    }
  ]
}

Response: 201 Created
{
  "data": [HealthMetric],
  "meta": {...}
}
```

### Body Measurements

#### Create Measurement
```http
POST /api/v1/measurements
Authorization: Bearer {token}
Content-Type: application/json

{
  "measured_at": "2025-11-14T08:00:00Z",
  "weight_kg": 82.5,
  "body_fat_percentage": 15.2,
  "measurements": {
    "chest_cm": 102,
    "waist_cm": 86,
    "bicep_left_cm": 38
  }
}

Response: 201 Created
{
  "data": BodyMeasurement,
  "meta": {...}
}
```

## Real-time Workout Tracking

### WebSocket Connection

For live workout tracking, establish a WebSocket connection:

```javascript
// Client-side connection
const ws = new WebSocket('wss://api.fulltracker.app/v1/workouts/{workout_id}/live');

// Authentication
ws.send(JSON.stringify({
  type: 'auth',
  token: 'bearer_token_here'
}));

// Listen for events
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Event:', data);
};
```

### WebSocket Events

#### Client -> Server

```typescript
// Set completed
{
  type: 'set.completed',
  payload: {
    exercise_id: string,
    set_id: string,
    actual_reps: number,
    actual_weight: number,
    completed_at: string
  }
}

// Rest timer started
{
  type: 'rest.started',
  payload: {
    exercise_id: string,
    set_id: string,
    duration_seconds: number
  }
}

// Exercise started
{
  type: 'exercise.started',
  payload: {
    exercise_id: string,
    started_at: string
  }
}

// Workout paused
{
  type: 'workout.paused',
  payload: {
    paused_at: string
  }
}

// Workout resumed
{
  type: 'workout.resumed',
  payload: {
    resumed_at: string
  }
}
```

#### Server -> Client

```typescript
// Acknowledgment
{
  type: 'ack',
  event_id: string,
  status: 'success' | 'error',
  message?: string
}

// Workout statistics update
{
  type: 'workout.stats',
  payload: {
    total_sets_completed: number,
    total_reps: number,
    total_volume: number,
    duration_seconds: number,
    calories_burned: number
  }
}

// Heart rate update (from connected device)
{
  type: 'heart_rate.update',
  payload: {
    heart_rate: number,
    timestamp: string
  }
}
```

### Server-Sent Events (Alternative)

For simpler one-way communication:

```http
GET /api/v1/workouts/{workout_id}/events
Authorization: Bearer {token}
Accept: text/event-stream

Response:
event: workout.stats
data: {"total_sets_completed": 5, "duration_seconds": 600}

event: heart_rate.update
data: {"heart_rate": 145, "timestamp": "2025-11-14T10:30:00Z"}
```

## Batch Operations

### Design Principles

1. **Idempotency**: All batch operations support idempotency keys
2. **Partial Success**: 207 Multi-Status for partial failures
3. **Client References**: Include client-side IDs for mapping
4. **Transaction Control**: Optional atomic vs. partial commit
5. **Size Limits**: Maximum 100 items per batch

### Batch Workout Sync (Offline-First)

```http
POST /api/v1/sync/workouts
Authorization: Bearer {token}
Content-Type: application/json
Idempotency-Key: sync_2025_11_14_abc123

{
  "sync_since": "2025-11-10T00:00:00Z",  // Last sync timestamp
  "device_id": "watch_123",
  "workouts": [
    {
      "client_id": "local_1",
      "client_updated_at": "2025-11-14T10:00:00Z",
      // ... full workout data
    }
  ],
  "conflict_resolution": "server_wins" | "client_wins" | "latest_wins"
}

Response: 207 Multi-Status
{
  "synced_workouts": [
    {
      "client_id": "local_1",
      "server_id": "workout_abc123",
      "status": "created",
      "conflicts": []
    }
  ],
  "server_changes": [
    {
      "server_id": "workout_xyz789",
      "action": "created",
      "data": Workout,
      "updated_at": "2025-11-13T15:00:00Z"
    }
  ],
  "summary": {
    "client_uploaded": 5,
    "server_downloaded": 2,
    "conflicts_resolved": 0
  },
  "next_sync_token": "sync_token_xyz",
  "meta": {...}
}
```

## Error Handling

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string;                // Machine-readable error code
    message: string;             // Human-readable error message
    details?: any;               // Additional error context
    field_errors?: FieldError[]; // Validation errors
    documentation_url?: string;  // Link to error docs
  };
  meta: {
    api_version: string;
    request_id: string;
    timestamp: string;
  };
}

interface FieldError {
  field: string;
  code: string;
  message: string;
}
```

### HTTP Status Codes

```
200 OK                    - Successful GET, PATCH, PUT
201 Created               - Successful POST
204 No Content            - Successful DELETE
207 Multi-Status          - Batch operation with mixed results
400 Bad Request           - Invalid request data
401 Unauthorized          - Missing or invalid authentication
403 Forbidden             - Insufficient permissions
404 Not Found             - Resource doesn't exist
409 Conflict              - Resource conflict (e.g., duplicate)
422 Unprocessable Entity  - Validation failed
429 Too Many Requests     - Rate limit exceeded
500 Internal Server Error - Server error
503 Service Unavailable   - Service temporarily unavailable
```

### Error Codes

```typescript
// Authentication errors (AUTH_*)
AUTH_MISSING_TOKEN        - No authentication token provided
AUTH_INVALID_TOKEN        - Token is invalid or expired
AUTH_INSUFFICIENT_SCOPE   - Token lacks required permissions

// Validation errors (VAL_*)
VAL_REQUIRED_FIELD        - Required field missing
VAL_INVALID_FORMAT        - Field format is invalid
VAL_OUT_OF_RANGE          - Value outside allowed range
VAL_INVALID_ENUM          - Invalid enum value

// Resource errors (RES_*)
RES_NOT_FOUND             - Resource not found
RES_ALREADY_EXISTS        - Resource already exists
RES_CONFLICT              - Resource state conflict

// Rate limiting (RATE_*)
RATE_LIMIT_EXCEEDED       - Rate limit exceeded
RATE_QUOTA_EXCEEDED       - Quota exceeded

// Server errors (SRV_*)
SRV_INTERNAL_ERROR        - Internal server error
SRV_UNAVAILABLE           - Service unavailable
SRV_TIMEOUT               - Request timeout
```

### Example Error Responses

#### Validation Error
```json
{
  "error": {
    "code": "VAL_REQUIRED_FIELD",
    "message": "Validation failed",
    "field_errors": [
      {
        "field": "exercises[0].exercise_id",
        "code": "required",
        "message": "exercise_id is required"
      },
      {
        "field": "started_at",
        "code": "invalid_format",
        "message": "started_at must be ISO 8601 format"
      }
    ],
    "documentation_url": "https://docs.fulltracker.app/errors/VAL_REQUIRED_FIELD"
  },
  "meta": {
    "api_version": "1.0",
    "request_id": "req_abc123",
    "timestamp": "2025-11-14T10:30:00Z"
  }
}
```

#### Rate Limit Error
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please retry after 60 seconds.",
    "details": {
      "limit": 100,
      "remaining": 0,
      "reset_at": "2025-11-14T11:00:00Z"
    },
    "documentation_url": "https://docs.fulltracker.app/rate-limits"
  },
  "meta": {
    "api_version": "1.0",
    "request_id": "req_abc123",
    "timestamp": "2025-11-14T10:30:00Z"
  }
}
```

## Rate Limiting

### Rate Limit Strategy

```
Standard Tier:
  - 1000 requests per hour per user
  - 100 requests per minute per user
  - 50 concurrent WebSocket connections per user

Premium Tier:
  - 5000 requests per hour per user
  - 500 requests per minute per user
  - 200 concurrent WebSocket connections per user

Batch Endpoints:
  - 100 items per batch
  - 50 batch requests per hour
```

### Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1699977600
X-RateLimit-Reset-After: 3600
Retry-After: 3600
```

### Rate Limit Algorithm

- Token bucket algorithm
- Per-user and per-endpoint limits
- Sliding window for accurate limits
- Exponential backoff recommended

## Caching Strategy

### Cache Headers

```http
# Cacheable resources (exercises library)
Cache-Control: public, max-age=3600, stale-while-revalidate=86400
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"

# User-specific resources (workouts)
Cache-Control: private, max-age=60
ETag: "workout_version_123"

# Real-time resources (live workout)
Cache-Control: no-store
```

### Conditional Requests

```http
GET /api/v1/exercises
If-None-Match: "33a64df551425fcc55e4d42a148795d9f25f89d4"

Response: 304 Not Modified
(or 200 OK with new data)
```

### Cache Invalidation

```http
POST /api/v1/workouts
X-Invalidate-Cache: workouts, stats

Response: 201 Created
X-Cache-Invalidated: workouts, stats
```

## Pagination

### Cursor-based Pagination (Recommended)

```http
GET /api/v1/workouts?limit=20&cursor=eyJpZCI6MTIzfQ==

Response:
{
  "data": [Workout],
  "pagination": {
    "next_cursor": "eyJpZCI6MTQzfQ==",
    "prev_cursor": "eyJpZCI6MTAzfQ==",
    "has_next": true,
    "has_prev": true,
    "limit": 20
  }
}
```

### Page-based Pagination (Alternative)

```http
GET /api/v1/exercises?page=2&limit=50

Response:
{
  "data": [Exercise],
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 245,
    "total_pages": 5,
    "has_next": true,
    "has_prev": true
  }
}
```

## Health Connect Integration

### Webhook Endpoints

Register webhooks for Health Connect events:

```http
POST /api/v1/webhooks
Authorization: Bearer {token}
Content-Type: application/json

{
  "url": "https://yourapp.com/webhooks/health-connect",
  "events": [
    "health_connect.workout.created",
    "health_connect.measurement.updated",
    "health_connect.sync.completed"
  ],
  "secret": "webhook_secret_abc123"
}

Response: 201 Created
{
  "data": {
    "id": "webhook_123",
    "url": "https://yourapp.com/webhooks/health-connect",
    "events": [...],
    "secret": "webhook_secret_abc123",
    "active": true,
    "created_at": "2025-11-14T10:00:00Z"
  }
}
```

### Webhook Payload

```typescript
interface WebhookPayload {
  id: string;                    // Event ID
  type: string;                  // Event type
  created_at: string;            // ISO 8601
  data: any;                     // Event-specific data
  webhook_id: string;            // Webhook that received this
}

// Signature verification
// Header: X-Webhook-Signature
// Algorithm: HMAC-SHA256(payload, secret)
```

### Health Connect Data Mapping

```typescript
// Health Connect -> API mapping
{
  "ExerciseSession": "Workout",
  "Steps": "HealthMetric(steps)",
  "HeartRate": "HealthMetric(heart_rate)",
  "Distance": "HealthMetric(distance)",
  "Weight": "BodyMeasurement(weight_kg)"
}
```

## Data Synchronization

### Sync Strategy

1. **Conflict Resolution**
   - Last-write-wins (default)
   - Server-wins (for corrections)
   - Client-wins (for offline edits)

2. **Sync Token Pattern**
```http
GET /api/v1/sync/changes?since_token=sync_abc123

Response:
{
  "changes": [
    {
      "type": "workout",
      "action": "created",
      "id": "workout_123",
      "data": Workout,
      "version": 1,
      "updated_at": "2025-11-14T10:00:00Z"
    }
  ],
  "next_token": "sync_xyz789",
  "has_more": false
}
```

3. **Delta Sync**
   - Only send changed fields
   - Reduce bandwidth for wearables

## API Client SDKs

### JavaScript/TypeScript
```typescript
import { FitnessAPI } from '@fulltracker/api-client';

const api = new FitnessAPI({
  apiKey: 'your_api_key',
  baseUrl: 'https://api.fulltracker.app/v1'
});

// Start workout
const workout = await api.workouts.create({
  title: 'Push Day',
  started_at: new Date().toISOString()
});

// Add exercise
await api.workouts.exercises.create(workout.id, {
  exercise_id: 'exercise_123',
  sets: [...]
});

// Complete set
await api.workouts.sets.update(workout.id, exercise.id, set.id, {
  actual_reps: 8,
  actual_weight: 80,
  completed: true
});
```

### Kotlin (Wear OS)
```kotlin
import com.fulltracker.api.FitnessAPIClient

val api = FitnessAPIClient(
    apiKey = "your_api_key",
    baseUrl = "https://api.fulltracker.app/v1"
)

// Batch sync workouts
lifecycleScope.launch {
    val result = api.sync.workouts(
        workouts = offlineWorkouts,
        deviceId = "watch_123"
    )

    result.syncedWorkouts.forEach {
        updateLocalId(it.clientId, it.serverId)
    }
}
```

## Migration from Server Actions

### Current Server Action Example
```typescript
// app/actions/workouts.ts
export async function createWorkout(data: WorkoutData) {
  const result = await db.query(
    'INSERT INTO workouts ...',
    [...]
  );
  return result.rows[0];
}
```

### Migrated API Route
```typescript
// app/api/v1/workouts/route.ts
export async function POST(request: Request) {
  const body = await request.json();

  // Validate
  const validated = workoutSchema.parse(body);

  // Authorize
  const user = await authenticate(request);

  // Create
  const workout = await createWorkout(validated, user.id);

  return NextResponse.json({
    data: workout,
    meta: {
      api_version: '1.0',
      request_id: generateRequestId()
    }
  }, { status: 201 });
}
```

### Backward Compatibility Layer
```typescript
// Server action wrapper
export async function createWorkoutAction(data: WorkoutData) {
  // Call API endpoint internally
  const response = await fetch('/api/v1/workouts', {
    method: 'POST',
    body: JSON.stringify(data)
  });

  const result = await response.json();
  return result.data;
}
```

## Performance Optimization

### Response Compression
```http
Accept-Encoding: gzip, deflate, br
Content-Encoding: br
```

### Field Selection (Sparse Fields)
```http
GET /api/v1/workouts?fields=id,title,started_at,status

Response:
{
  "data": [
    {
      "id": "workout_123",
      "title": "Push Day",
      "started_at": "2025-11-14T10:00:00Z",
      "status": "completed"
    }
  ]
}
```

### Batch Fetching (N+1 Prevention)
```http
GET /api/v1/workouts?include=exercises,routine

Response:
{
  "data": [Workout],
  "included": {
    "exercises": [Exercise],
    "routines": [Routine]
  }
}
```

### Database Optimization
- Indexed queries on user_id, status, date ranges
- Materialized views for statistics
- Connection pooling (already implemented)
- Query result caching

## Monitoring & Observability

### Request Tracking
```http
X-Request-ID: req_abc123
X-Trace-ID: trace_xyz789
```

### Performance Metrics
- API response time (p50, p95, p99)
- Error rate by endpoint
- Rate limit hits
- WebSocket connection duration

### Logging Format
```json
{
  "timestamp": "2025-11-14T10:30:00Z",
  "level": "info",
  "request_id": "req_abc123",
  "user_id": "user_123",
  "method": "POST",
  "path": "/api/v1/workouts",
  "status": 201,
  "duration_ms": 45,
  "ip": "192.168.1.1"
}
```

## Testing Strategy

### Integration Tests
```typescript
describe('Workout API', () => {
  it('should create workout and sync to Health Connect', async () => {
    const response = await request(app)
      .post('/api/v1/workouts')
      .set('Authorization', `Bearer ${token}`)
      .send(workoutData);

    expect(response.status).toBe(201);
    expect(response.body.data.id).toBeDefined();
  });
});
```

### Load Testing
- Target: 1000 concurrent users
- Workout creation: 100 req/s
- Real-time updates: 500 WebSocket messages/s
- Batch sync: 50 batches/min

## Security Considerations

1. **Input Validation**: All inputs validated and sanitized
2. **SQL Injection**: Parameterized queries (already using pg)
3. **CORS**: Whitelist allowed origins
4. **Rate Limiting**: Per-user and per-endpoint
5. **Audit Logging**: Track sensitive operations
6. **Data Encryption**: At-rest and in-transit
7. **Token Expiration**: Short-lived access tokens
8. **Webhook Security**: HMAC signature verification

## Next Steps

1. **Phase 1**: Core API endpoints (exercises, workouts, routines)
2. **Phase 2**: Real-time tracking (WebSocket/SSE)
3. **Phase 3**: Batch operations and sync
4. **Phase 4**: Health Connect integration
5. **Phase 5**: Client SDKs and documentation
6. **Phase 6**: Wear OS app development

---

**Last Updated**: 2025-11-14
**API Version**: 1.0 (Draft)
**Status**: Design Phase
