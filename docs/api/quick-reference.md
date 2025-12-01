# Fitness API Quick Reference

## Base URLs

```
Production:  https://api.fulltracker.app/v1
Development: http://localhost:3000/api/v1
```

## Authentication

All requests require authentication via Bearer token:

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     https://api.fulltracker.app/v1/workouts
```

## Common Request Examples

### 1. Start a Workout

```bash
curl -X POST https://api.fulltracker.app/v1/workouts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: unique-key-123" \
  -d '{
    "title": "Chest & Triceps",
    "started_at": "2025-11-14T10:00:00Z",
    "status": "in_progress",
    "location": {
      "type": "gym",
      "name": "LA Fitness"
    }
  }'
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Chest & Triceps",
    "status": "in_progress",
    "started_at": "2025-11-14T10:00:00Z",
    "exercises": [],
    "metrics": {
      "total_volume": 0,
      "total_reps": 0,
      "total_sets": 0
    },
    "created_at": "2025-11-14T10:00:00Z",
    "updated_at": "2025-11-14T10:00:00Z"
  },
  "meta": {
    "api_version": "1.0",
    "request_id": "req_abc123",
    "timestamp": "2025-11-14T10:00:00Z"
  }
}
```

### 2. Add Exercise to Workout

```bash
curl -X POST https://api.fulltracker.app/v1/workouts/550e8400-e29b-41d4-a716-446655440000/exercises \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "exercise_id": "bench-press-123",
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
      },
      {
        "set_number": 3,
        "set_type": "normal",
        "target_reps": 8,
        "target_weight": 80
      }
    ]
  }'
```

### 3. Complete a Set

```bash
curl -X PATCH https://api.fulltracker.app/v1/workouts/WORKOUT_ID/exercises/EXERCISE_ID/sets/SET_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "actual_reps": 8,
    "actual_weight": 80,
    "rpe": 7,
    "completed": true,
    "completed_at": "2025-11-14T10:15:00Z"
  }'
```

### 3b. Log Set via Web Logger

Simple endpoint used by the web dashboard when quickly logging sets without exercise-level IDs.

```bash
curl -X POST https://api.fulltracker.app/v1/workouts/123/sets \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "exerciseId": 42,
    "reps": 8,
    "weight": 82.5,
    "rpe": 8,
    "setType": "normal"
  }'
```

**Response**

```json
{
  "success": true,
  "isPersonalRecord": false
}
```

### 3c. Fetch Last Performance for an Exercise

Used by the workout logger to show your previous session numbers for a given exercise.

```bash
curl https://api.fulltracker.app/v1/exercises/42/last-performance \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response**

```json
{
  "success": true,
  "sessionId": 987,
  "lastPerformedAt": "2025-11-10T13:40:00Z",
  "sets": [
    { "setNumber": 1, "reps": 8, "weight": 82.5, "rpe": 7, "setType": "normal" },
    { "setNumber": 2, "reps": 8, "weight": 82.5, "rpe": 8, "setType": "normal" },
    { "setNumber": 3, "reps": 6, "weight": 82.5, "rpe": 9, "setType": "failure" }
  ]
}
```

### 9. Health Metrics

**List Metrics**

```bash
curl "https://api.fulltracker.app/v1/health/metrics?metric_type=heart_rate&from_date=2025-11-01" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Create Metric**

```bash
curl -X POST https://api.fulltracker.app/v1/health/metrics \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "metricType": "heart_rate",
    "value": 145,
    "unit": "bpm",
    "recordedAt": "2025-11-14T10:32:00Z",
    "source": "wear_os",
    "deviceId": "galaxy-watch-6"
  }'
```

**Batch Upload (Health Connect sync)**

```bash
curl -X POST https://api.fulltracker.app/v1/health/metrics/batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "metrics": [
      { "metricType": "heart_rate", "value": 140, "unit": "bpm", "recordedAt": "2025-11-14T10:00:00Z", "source": "health_connect" },
      { "metricType": "heart_rate", "value": 150, "unit": "bpm", "recordedAt": "2025-11-14T10:05:00Z", "source": "health_connect" }
    ]
  }'
```

### 4. Batch Update Sets

```bash
curl -X PATCH https://api.fulltracker.app/v1/workouts/WORKOUT_ID/exercises/EXERCISE_ID/sets/batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sets": [
      {
        "id": "set-1",
        "actual_reps": 8,
        "actual_weight": 80,
        "completed": true
      },
      {
        "id": "set-2",
        "actual_reps": 7,
        "actual_weight": 80,
        "rpe": 8,
        "completed": true
      },
      {
        "id": "set-3",
        "actual_reps": 6,
        "actual_weight": 80,
        "rpe": 9,
        "completed": true
      }
    ]
  }'
```

### 5. Complete Workout

```bash
curl -X PATCH https://api.fulltracker.app/v1/workouts/WORKOUT_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "completed_at": "2025-11-14T11:30:00Z",
    "notes": "Great workout! Felt strong on bench press."
  }'
```

### 6. List Workouts (Paginated)

```bash
curl "https://api.fulltracker.app/v1/workouts?status=completed&from_date=2025-11-01T00:00:00Z&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "data": [
    {
      "id": "workout-1",
      "title": "Chest & Triceps",
      "status": "completed",
      "started_at": "2025-11-14T10:00:00Z",
      "completed_at": "2025-11-14T11:30:00Z",
      "duration_seconds": 5400,
      "metrics": {
        "total_volume": 3200,
        "total_reps": 64,
        "total_sets": 12,
        "calories_burned": 342
      }
    }
  ],
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
    "request_id": "req_xyz789"
  }
}
```

### 7. Search Exercises

```bash
curl "https://api.fulltracker.app/v1/exercises?search=bench&category=strength&muscle_group=chest" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 8. Create Routine

```bash
curl -X POST https://api.fulltracker.app/v1/routines \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Push Day A",
    "description": "Chest, shoulders, and triceps focus",
    "category": "push",
    "difficulty": "intermediate",
    "exercises": [
      {
        "exercise_id": "bench-press-123",
        "order": 1,
        "target_sets": 3,
        "target_reps": 8,
        "target_weight": 80,
        "rest_seconds": 120
      },
      {
        "exercise_id": "shoulder-press-456",
        "order": 2,
        "target_sets": 3,
        "target_reps": 10,
        "target_weight": 50,
        "rest_seconds": 90
      }
    ]
  }'
```

### 9. Start Workout from Routine

```bash
curl -X POST https://api.fulltracker.app/v1/routines/ROUTINE_ID/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Push Day A - Nov 14",
    "started_at": "2025-11-14T10:00:00Z"
  }'
```

### 10. Batch Sync Workouts (Wearable)

```bash
curl -X POST https://api.fulltracker.app/v1/workouts/batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: batch-sync-20251114" \
  -d '{
    "workouts": [
      {
        "client_id": "local_workout_1",
        "title": "Morning Run",
        "started_at": "2025-11-14T06:00:00Z",
        "completed_at": "2025-11-14T06:45:00Z",
        "status": "completed",
        "exercises": [
          {
            "exercise_id": "running-123",
            "order": 1,
            "sets": [
              {
                "set_number": 1,
                "set_type": "normal",
                "actual_duration_seconds": 2700,
                "actual_distance_meters": 5000,
                "completed": true
              }
            ]
          }
        ],
        "sync_metadata": {
          "source": "wear_os",
          "device_id": "watch_123"
        }
      }
    ]
  }'
```

**Response (207 Multi-Status):**
```json
{
  "results": [
    {
      "client_id": "local_workout_1",
      "status": "created",
      "data": {
        "id": "workout-abc123",
        "title": "Morning Run",
        "status": "completed"
      }
    }
  ],
  "summary": {
    "total": 1,
    "created": 1,
    "updated": 0,
    "failed": 0
  }
}
```

### 11. Sync Changes (Delta Sync)

```bash
curl "https://api.fulltracker.app/v1/sync/changes?since_token=sync_abc123&resource_types=workouts,routines" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "changes": [
    {
      "type": "workout",
      "action": "created",
      "id": "workout-xyz",
      "data": { /* workout data */ },
      "version": 1,
      "updated_at": "2025-11-14T12:00:00Z"
    },
    {
      "type": "routine",
      "action": "updated",
      "id": "routine-abc",
      "data": { /* routine data */ },
      "version": 2,
      "updated_at": "2025-11-14T11:30:00Z"
    }
  ],
  "next_token": "sync_xyz789",
  "has_more": false
}
```

### 12. Add Health Metrics (Batch)

```bash
curl -X POST https://api.fulltracker.app/v1/health/metrics/batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "metrics": [
      {
        "metric_type": "heart_rate",
        "value": 145,
        "unit": "bpm",
        "recorded_at": "2025-11-14T10:30:00Z",
        "source": "wear_os",
        "device_id": "watch_123"
      },
      {
        "metric_type": "heart_rate",
        "value": 152,
        "unit": "bpm",
        "recorded_at": "2025-11-14T10:31:00Z",
        "source": "wear_os",
        "device_id": "watch_123"
      }
    ]
  }'
```

### 13. Add Body Measurement

```bash
curl -X POST https://api.fulltracker.app/v1/measurements \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "measured_at": "2025-11-14T08:00:00Z",
    "weight_kg": 82.5,
    "body_fat_percentage": 15.2,
    "measurements": {
      "chest_cm": 102,
      "waist_cm": 86,
      "bicep_left_cm": 38,
      "bicep_right_cm": 38
    },
    "notes": "Morning measurement before breakfast"
  }'
```

## WebSocket Connection

### Connect to Live Workout

```javascript
const ws = new WebSocket('wss://api.fulltracker.app/v1/workouts/WORKOUT_ID/live');

// Authenticate
ws.addEventListener('open', () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'YOUR_ACCESS_TOKEN'
  }));
});

// Listen for updates
ws.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'workout.stats') {
    console.log('Updated stats:', data.payload);
    // { total_sets_completed: 5, total_reps: 40, duration_seconds: 600 }
  }

  if (data.type === 'heart_rate.update') {
    console.log('Heart rate:', data.payload.heart_rate);
  }
});

// Complete a set
ws.send(JSON.stringify({
  type: 'set.completed',
  payload: {
    exercise_id: 'exercise-123',
    set_id: 'set-456',
    actual_reps: 8,
    actual_weight: 80,
    rpe: 7,
    completed_at: new Date().toISOString()
  }
}));
```

## Error Responses

### 400 Bad Request
```json
{
  "error": {
    "code": "VAL_INVALID_FORMAT",
    "message": "Invalid date format",
    "details": {
      "field": "started_at",
      "expected": "ISO 8601"
    }
  },
  "meta": {
    "api_version": "1.0",
    "request_id": "req_abc123"
  }
}
```

### 401 Unauthorized
```json
{
  "error": {
    "code": "AUTH_INVALID_TOKEN",
    "message": "Token is invalid or expired",
    "documentation_url": "https://docs.fulltracker.app/errors/AUTH_INVALID_TOKEN"
  },
  "meta": {
    "api_version": "1.0",
    "request_id": "req_abc123"
  }
}
```

### 422 Validation Error
```json
{
  "error": {
    "code": "VAL_REQUIRED_FIELD",
    "message": "Validation failed",
    "field_errors": [
      {
        "field": "title",
        "code": "required",
        "message": "title is required"
      },
      {
        "field": "started_at",
        "code": "invalid_format",
        "message": "started_at must be ISO 8601 format"
      }
    ]
  }
}
```

### 429 Rate Limit Exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please retry after 60 seconds.",
    "details": {
      "limit": 100,
      "remaining": 0,
      "reset_at": "2025-11-14T11:00:00Z"
    }
  }
}
```

## Response Headers

### Rate Limit Headers
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1699977600
X-RateLimit-Reset-After: 3600
```

### Cache Headers
```
Cache-Control: private, max-age=60
ETag: "workout_version_123"
```

### Pagination Links
```
Link: <https://api.fulltracker.app/v1/workouts?page=2>; rel="next",
      <https://api.fulltracker.app/v1/workouts?page=8>; rel="last"
```

## Query Parameters

### Common Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `page` | integer | Page number (1-indexed) | `?page=2` |
| `limit` | integer | Items per page (max 100) | `?limit=50` |
| `sort` | string | Sort field (prefix `-` for desc) | `?sort=-created_at` |
| `search` | string | Search query | `?search=bench` |
| `include` | string | Related resources (comma-separated) | `?include=exercises,routine` |
| `fields` | string | Sparse fields (comma-separated) | `?fields=id,title,status` |

### Filtering

```bash
# Status filter
?status=completed

# Date range
?from_date=2025-11-01T00:00:00Z&to_date=2025-11-14T23:59:59Z

# Multiple filters
?status=completed&from_date=2025-11-01T00:00:00Z&category=strength
```

## SDK Usage Examples

### JavaScript/TypeScript

```typescript
import { FitnessAPIClient } from '@fulltracker/api-client';

const api = new FitnessAPIClient({
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
  exercise_id: 'bench-press-123',
  order: 1,
  sets: [
    { set_number: 1, set_type: 'warmup', target_reps: 12, target_weight: 60 },
    { set_number: 2, set_type: 'normal', target_reps: 8, target_weight: 80 }
  ]
});

// Complete set
await api.workouts.sets.update(workout.id, exerciseId, setId, {
  actual_reps: 8,
  actual_weight: 80,
  rpe: 7,
  completed: true
});

// Complete workout
await api.workouts.update(workout.id, {
  status: 'completed',
  completed_at: new Date().toISOString()
});
```

### Kotlin (Wear OS)

```kotlin
import com.fulltracker.api.FitnessAPIClient

val api = FitnessAPIClient(
    apiKey = "your_api_key",
    baseUrl = "https://api.fulltracker.app/v1"
)

// Start workout
lifecycleScope.launch {
    val workout = api.workouts.create(
        WorkoutCreate(
            title = "Push Day",
            startedAt = Instant.now()
        )
    )

    // Batch sync offline workouts
    val result = api.sync.workouts(
        workouts = offlineWorkouts,
        deviceId = "watch_123"
    )

    result.syncedWorkouts.forEach {
        updateLocalId(it.clientId, it.serverId)
    }
}
```

### React Hook

```typescript
import { useLiveWorkout } from '@/hooks/use-live-workout';

function WorkoutScreen({ workoutId }) {
  const { stats, connected, completeSet } = useLiveWorkout(workoutId);

  const handleSetComplete = (setId: string) => {
    completeSet(setId, {
      actual_reps: 8,
      actual_weight: 80,
      rpe: 7
    });
  };

  return (
    <div>
      <p>Connected: {connected ? 'Yes' : 'No'}</p>
      <p>Sets: {stats?.total_sets_completed}</p>
      <p>Volume: {stats?.total_volume} kg</p>
    </div>
  );
}
```

## Rate Limits

| Tier | Requests/Hour | Requests/Minute | Concurrent WS |
|------|---------------|-----------------|---------------|
| Standard | 1,000 | 100 | 50 |
| Premium | 5,000 | 500 | 200 |

### Batch Limits

- Maximum 100 items per batch request
- Maximum 50 batch requests per hour
- Total payload size limit: 5 MB

## Best Practices

1. **Use Idempotency Keys**: Always include `Idempotency-Key` header for create operations
2. **Batch Operations**: Use batch endpoints for syncing multiple workouts from wearables
3. **WebSocket for Live Data**: Use WebSocket connections for real-time workout tracking
4. **Efficient Pagination**: Use cursor-based pagination for large datasets
5. **Cache Responses**: Respect `Cache-Control` and `ETag` headers
6. **Handle Rate Limits**: Implement exponential backoff when rate limited
7. **Error Handling**: Always check error codes and implement proper retry logic
8. **Field Selection**: Use `fields` parameter to reduce response size
9. **Delta Sync**: Use sync tokens for efficient incremental sync

## Support

- Documentation: https://docs.fulltracker.app
- API Status: https://status.fulltracker.app
- Support: api@fulltracker.app
