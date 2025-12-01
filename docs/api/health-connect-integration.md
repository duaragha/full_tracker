# Health Connect Integration Guide

## Overview

Health Connect is Android's unified health and fitness platform that allows apps to securely store and share health data. This guide covers how to integrate your fitness tracking API with Health Connect for seamless data synchronization.

## Health Connect Data Types Mapping

### Workout Session Mapping

| Health Connect Type | API Resource | Mapping |
|---------------------|--------------|---------|
| `ExerciseSession` | `Workout` | Complete workout session |
| `ExerciseSegment` | `WorkoutExercise` | Individual exercise within workout |
| `ExerciseRep` | `Set` | Individual set data |
| `HeartRate` | `HealthMetric(heart_rate)` | Heart rate measurements |
| `Distance` | `HealthMetric(distance)` | Distance covered |
| `TotalCaloriesBurned` | `Workout.metrics.calories_burned` | Calories burned |

### Body Measurements Mapping

| Health Connect Type | API Resource | Field |
|---------------------|--------------|-------|
| `Weight` | `BodyMeasurement` | `weight_kg` |
| `BodyFat` | `BodyMeasurement` | `body_fat_percentage` |
| `Height` | `BodyMeasurement` | `measurements.height_cm` |

### Activity Metrics Mapping

| Health Connect Type | API Resource | Mapping |
|---------------------|--------------|---------|
| `Steps` | `HealthMetric(steps)` | Daily steps |
| `ActiveCaloriesBurned` | `HealthMetric(calories_burned)` | Active calories |
| `RestingHeartRate` | `HealthMetric(resting_heart_rate)` | Resting HR |
| `Vo2Max` | `HealthMetric(vo2_max)` | VO2 Max measurement |
| `SleepSession` | `HealthMetric(sleep_duration)` | Sleep tracking |

## Architecture

```
┌─────────────────┐
│   Your App      │
│  (Wear OS/      │
│   Android)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Health Connect  │
│   Android API   │
└────────┬────────┘
         │
         ▼ (Webhook/Sync)
┌─────────────────┐
│  Full Tracker   │
│   Fitness API   │
└─────────────────┘
```

## Integration Flows

### 1. Workout Session Sync (Health Connect → API)

When a workout is completed in Health Connect:

```kotlin
// Kotlin (Wear OS/Android)
suspend fun syncWorkoutToAPI(exerciseSession: ExerciseSession) {
    val workout = WorkoutCreate(
        title = exerciseSession.title ?: "Workout",
        startedAt = exerciseSession.startTime,
        completedAt = exerciseSession.endTime,
        status = "completed",
        exercises = exerciseSession.segments.map { segment ->
            WorkoutExerciseCreate(
                exerciseId = mapActivityTypeToExerciseId(segment.segmentType),
                order = segment.order,
                sets = segment.reps.map { rep ->
                    SetCreate(
                        setNumber = rep.count,
                        setType = "normal",
                        actualReps = rep.count,
                        actualWeight = rep.type.weight
                    )
                }
            )
        },
        syncMetadata = SyncMetadata(
            source = "health_connect",
            deviceId = getDeviceId(),
            syncedAt = Instant.now()
        )
    )

    api.workouts.create(workout)
}
```

### 2. Workout Session Sync (API → Health Connect)

When a workout is created via API, sync to Health Connect:

```kotlin
suspend fun syncWorkoutToHealthConnect(workout: Workout) {
    val exerciseSession = ExerciseSession(
        exerciseType = mapCategoryToExerciseType(workout.exercises[0].category),
        title = workout.title,
        notes = workout.notes,
        startTime = workout.startedAt,
        endTime = workout.completedAt,
        startZoneOffset = ZoneOffset.systemDefault().rules.getOffset(workout.startedAt)
    )

    // Add segments for each exercise
    val segments = workout.exercises.map { exercise ->
        ExerciseSegment(
            startTime = exercise.startedAt,
            endTime = exercise.completedAt,
            segmentType = mapExerciseToSegmentType(exercise.exerciseId),
            repetitions = exercise.sets.sumOf { it.actualReps ?: 0 }
        )
    }

    // Add heart rate data if available
    val heartRateRecords = workout.metrics.heartRateSamples?.map { sample ->
        HeartRateRecord(
            time = sample.timestamp,
            beatsPerMinute = sample.heartRate
        )
    }

    healthConnectClient.insertRecords(
        listOf(exerciseSession) + segments + heartRateRecords
    )
}
```

### 3. Real-time Heart Rate Sync

During active workout:

```kotlin
// Wear OS app
class WorkoutService : Service() {
    private val heartRateCallback = object : MeasureCallback {
        override fun onDataReceived(data: DataPointContainer) {
            val heartRate = data.getData(DataType.HEART_RATE_BPM)

            // Stream to Health Connect
            healthConnectClient.insertRecords(listOf(
                HeartRateRecord(
                    time = Instant.now(),
                    beatsPerMinute = heartRate.value.toLong()
                )
            ))

            // Stream to API via WebSocket
            webSocket.send(json.encodeToString(
                HeartRateUpdate(
                    heartRate = heartRate.value,
                    timestamp = Instant.now()
                )
            ))
        }
    }
}
```

## Webhook Configuration

### Register Webhook for Health Connect Events

```bash
curl -X POST https://api.fulltracker.app/v1/webhooks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://yourapp.com/webhooks/health-connect",
    "events": [
      "health_connect.workout.created",
      "health_connect.workout.updated",
      "health_connect.measurement.created",
      "health_connect.metrics.batch_created"
    ],
    "secret": "your_webhook_secret"
  }'
```

### Webhook Payload Example

```json
{
  "id": "evt_abc123",
  "type": "health_connect.workout.created",
  "created_at": "2025-11-14T10:30:00Z",
  "data": {
    "workout_id": "workout_123",
    "user_id": "user_456",
    "source": "health_connect",
    "device_id": "device_789",
    "workout": {
      "id": "workout_123",
      "title": "Morning Run",
      "status": "completed",
      "started_at": "2025-11-14T06:00:00Z",
      "completed_at": "2025-11-14T06:45:00Z",
      "exercises": [
        {
          "exercise_id": "running-123",
          "exercise_name": "Running",
          "order": 1,
          "sets": [
            {
              "actual_duration_seconds": 2700,
              "actual_distance_meters": 5000,
              "completed": true
            }
          ]
        }
      ],
      "metrics": {
        "total_volume": 0,
        "calories_burned": 450,
        "average_heart_rate": 145,
        "max_heart_rate": 165
      }
    }
  },
  "webhook_id": "webhook_xyz"
}
```

### Webhook Security

Verify webhook signatures:

```typescript
import * as crypto from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// In your webhook handler
export async function POST(request: Request) {
  const signature = request.headers.get('X-Webhook-Signature');
  const payload = await request.text();

  if (!verifyWebhookSignature(payload, signature, WEBHOOK_SECRET)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = JSON.parse(payload);

  switch (event.type) {
    case 'health_connect.workout.created':
      await handleWorkoutCreated(event.data);
      break;
    case 'health_connect.measurement.created':
      await handleMeasurementCreated(event.data);
      break;
    // ... other event types
  }

  return new Response('OK');
}
```

## Data Type Converters

### Exercise Type Mapping

```kotlin
object HealthConnectConverter {
    fun mapActivityTypeToExerciseId(activityType: Int): String {
        return when (activityType) {
            ExerciseSegment.EXERCISE_SEGMENT_TYPE_BARBELL_SHOULDER_PRESS -> "shoulder-press-123"
            ExerciseSegment.EXERCISE_SEGMENT_TYPE_BENCH_PRESS -> "bench-press-123"
            ExerciseSegment.EXERCISE_SEGMENT_TYPE_BACK_SQUAT -> "squat-123"
            ExerciseSegment.EXERCISE_SEGMENT_TYPE_DEADLIFT -> "deadlift-123"
            ExerciseSegment.EXERCISE_SEGMENT_TYPE_RUNNING -> "running-123"
            // ... more mappings
            else -> "unknown-exercise"
        }
    }

    fun mapExerciseToSegmentType(exerciseId: String): Int {
        return when (exerciseId) {
            "bench-press-123" -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_BENCH_PRESS
            "squat-123" -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_BACK_SQUAT
            "deadlift-123" -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_DEADLIFT
            // ... more mappings
            else -> ExerciseSegment.EXERCISE_SEGMENT_TYPE_OTHER_WORKOUT
        }
    }

    fun mapCategoryToExerciseType(category: String): Int {
        return when (category) {
            "strength" -> ExerciseSessionType.EXERCISE_SESSION_TYPE_STRENGTH_TRAINING
            "cardio" -> ExerciseSessionType.EXERCISE_SESSION_TYPE_RUNNING
            "flexibility" -> ExerciseSessionType.EXERCISE_SESSION_TYPE_STRETCHING
            else -> ExerciseSessionType.EXERCISE_SESSION_TYPE_OTHER_WORKOUT
        }
    }
}
```

### Weight Unit Conversion

```kotlin
object UnitConverter {
    fun poundsToKg(pounds: Double): Double = pounds * 0.453592
    fun kgToPounds(kg: Double): Double = kg * 2.20462

    fun metersToMiles(meters: Double): Double = meters * 0.000621371
    fun milesToMeters(miles: Double): Double = miles * 1609.34
}
```

## Batch Sync Strategy

### Efficient Batch Upload

```kotlin
class HealthConnectSyncService {
    suspend fun syncToAPI() {
        val lastSyncTime = preferences.getLastSyncTime()
        val now = Instant.now()

        // Read all changes since last sync
        val changes = healthConnectClient.getChanges(
            changesToken = lastSyncToken,
            recordTypes = setOf(
                ExerciseSession::class,
                HeartRateRecord::class,
                Weight::class,
                Steps::class
            )
        )

        // Group by type
        val workoutSessions = changes.filterIsInstance<ExerciseSession>()
        val heartRates = changes.filterIsInstance<HeartRateRecord>()
        val weights = changes.filterIsInstance<Weight>()
        val steps = changes.filterIsInstance<Steps>()

        // Batch create workouts
        if (workoutSessions.isNotEmpty()) {
            api.workouts.batchCreate(
                workoutSessions.map { session ->
                    convertToWorkoutCreate(session)
                }
            )
        }

        // Batch create health metrics
        if (heartRates.isNotEmpty() || steps.isNotEmpty()) {
            api.health.metrics.batchCreate(
                heartRates.map { convertToHealthMetric(it) } +
                steps.map { convertToHealthMetric(it) }
            )
        }

        // Batch create measurements
        if (weights.isNotEmpty()) {
            api.measurements.batchCreate(
                weights.map { convertToBodyMeasurement(it) }
            )
        }

        // Update sync token
        preferences.setLastSyncTime(now)
        preferences.setLastSyncToken(changes.newToken)
    }

    private fun convertToWorkoutCreate(session: ExerciseSession): WorkoutCreate {
        // Implementation
    }

    private fun convertToHealthMetric(record: Record): HealthMetricCreate {
        // Implementation
    }
}
```

## Conflict Resolution

### Handling Duplicate Data

```kotlin
suspend fun syncWithConflictResolution(workout: Workout) {
    try {
        // Attempt to create
        api.workouts.create(workout)
    } catch (e: ConflictException) {
        // Workout already exists, check which is newer
        val existingWorkout = api.workouts.get(workout.clientId)

        if (workout.updatedAt > existingWorkout.updatedAt) {
            // Local is newer, update remote
            api.workouts.update(existingWorkout.id, workout)
        } else {
            // Remote is newer, update local
            updateLocalWorkout(existingWorkout)
        }
    }
}
```

## Permissions

### Required Health Connect Permissions

Add to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.health.READ_EXERCISE" />
<uses-permission android:name="android.permission.health.WRITE_EXERCISE" />
<uses-permission android:name="android.permission.health.READ_HEART_RATE" />
<uses-permission android:name="android.permission.health.WRITE_HEART_RATE" />
<uses-permission android:name="android.permission.health.READ_STEPS" />
<uses-permission android:name="android.permission.health.WRITE_STEPS" />
<uses-permission android:name="android.permission.health.READ_DISTANCE" />
<uses-permission android:name="android.permission.health.WRITE_DISTANCE" />
<uses-permission android:name="android.permission.health.READ_WEIGHT" />
<uses-permission android:name="android.permission.health.WRITE_WEIGHT" />
```

### Request Permissions at Runtime

```kotlin
class MainActivity : ComponentActivity() {
    private val requestPermissions = registerForActivityResult(
        PermissionContract()
    ) { granted ->
        if (granted.containsAll(REQUIRED_PERMISSIONS)) {
            // Permissions granted, start sync
            startHealthConnectSync()
        }
    }

    companion object {
        val REQUIRED_PERMISSIONS = setOf(
            HealthPermission.READ_EXERCISE,
            HealthPermission.WRITE_EXERCISE,
            HealthPermission.READ_HEART_RATE,
            HealthPermission.WRITE_HEART_RATE,
            HealthPermission.READ_STEPS,
            HealthPermission.WRITE_STEPS
        )
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Check and request permissions
        lifecycleScope.launch {
            val granted = healthConnectClient.permissionController
                .getGrantedPermissions(REQUIRED_PERMISSIONS)

            if (!granted.containsAll(REQUIRED_PERMISSIONS)) {
                requestPermissions.launch(REQUIRED_PERMISSIONS)
            }
        }
    }
}
```

## Background Sync

### WorkManager for Periodic Sync

```kotlin
class HealthConnectSyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return try {
            val syncService = HealthConnectSyncService(applicationContext)
            syncService.syncToAPI()
            Result.success()
        } catch (e: Exception) {
            Log.e("HealthConnectSync", "Sync failed", e)
            Result.retry()
        }
    }
}

// Schedule periodic sync
fun scheduleHealthConnectSync(context: Context) {
    val syncRequest = PeriodicWorkRequestBuilder<HealthConnectSyncWorker>(
        repeatInterval = 1,
        repeatIntervalTimeUnit = TimeUnit.HOURS
    )
        .setConstraints(
            Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
        )
        .build()

    WorkManager.getInstance(context).enqueueUniquePeriodicWork(
        "health_connect_sync",
        ExistingPeriodicWorkPolicy.KEEP,
        syncRequest
    )
}
```

## Testing

### Mock Health Connect Data

```kotlin
@Test
fun testWorkoutSync() = runTest {
    // Create mock Health Connect session
    val mockSession = ExerciseSession(
        exerciseType = ExerciseSessionType.EXERCISE_SESSION_TYPE_STRENGTH_TRAINING,
        title = "Test Workout",
        startTime = Instant.now().minusSeconds(3600),
        endTime = Instant.now(),
        startZoneOffset = ZoneOffset.UTC
    )

    // Mock API client
    val mockApi = mockk<FitnessAPIClient>()
    coEvery { mockApi.workouts.create(any()) } returns WorkoutResponse(
        data = Workout(id = "test-workout-123")
    )

    // Test sync
    val syncService = HealthConnectSyncService(mockApi)
    syncService.syncWorkoutToAPI(mockSession)

    // Verify API was called
    coVerify {
        mockApi.workouts.create(
            match { it.title == "Test Workout" }
        )
    }
}
```

## Best Practices

1. **Incremental Sync**: Use change tokens to sync only new/modified data
2. **Batch Operations**: Group multiple records into batch API calls
3. **Offline Support**: Queue sync operations for when network is available
4. **Idempotency**: Use client IDs to prevent duplicate records
5. **Error Handling**: Implement retry logic with exponential backoff
6. **Data Validation**: Validate data before syncing to API
7. **Privacy**: Only sync data user has explicitly allowed
8. **Battery Optimization**: Use WorkManager for background sync
9. **Conflict Resolution**: Implement strategy for handling data conflicts
10. **Logging**: Log sync operations for debugging

## API Endpoints for Health Connect

### Dedicated Health Connect Sync Endpoint

```bash
POST /api/v1/health-connect/sync

{
  "device_id": "pixel_watch_123",
  "sync_token": "token_abc",
  "workouts": [...],
  "health_metrics": [...],
  "body_measurements": [...]
}
```

### Query Health Connect Source Data

```bash
GET /api/v1/workouts?source=health_connect
GET /api/v1/health/metrics?source=health_connect&device_id=pixel_watch_123
```

## Troubleshooting

### Common Issues

1. **Duplicate Workouts**: Ensure client_id is properly set
2. **Missing Data**: Check Health Connect permissions
3. **Sync Delays**: Verify WorkManager constraints
4. **Type Mismatches**: Use proper converter functions
5. **Rate Limits**: Implement proper batching

### Debug Logging

```kotlin
class HealthConnectLogger {
    fun logSyncOperation(
        operation: String,
        recordCount: Int,
        success: Boolean,
        error: Exception? = null
    ) {
        Log.d("HealthConnect", """
            Operation: $operation
            Records: $recordCount
            Success: $success
            Error: ${error?.message}
            Timestamp: ${Instant.now()}
        """.trimIndent())

        // Send to API for monitoring
        api.logs.create(
            LogEntry(
                operation = operation,
                recordCount = recordCount,
                success = success,
                error = error?.message
            )
        )
    }
}
```

## Resources

- [Health Connect Documentation](https://developer.android.com/health-and-fitness/guides/health-connect)
- [API Documentation](https://docs.fulltracker.app)
- [Sample App](https://github.com/fulltracker/health-connect-sample)
- [Support Forum](https://community.fulltracker.app)
