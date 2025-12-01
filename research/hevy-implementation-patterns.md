# Hevy Implementation Patterns - Deep Dive

## Workout Session State Management

### Real-Time Workout Tracking Pattern

```typescript
// Hevy's likely approach to managing active workout sessions

interface WorkoutSession {
  id: string;
  templateId?: string;
  startTime: Date;
  endTime?: Date;
  exercises: ExerciseInSession[];
  notes?: string;
  bodyweight?: number;
  duration: number;
}

interface ExerciseInSession {
  id: string;
  exerciseId: string;
  name: string;
  sets: SetInSession[];
  notes?: string;
  restTimer?: number;
}

interface SetInSession {
  id: string;
  setNumber: number;
  reps?: number;
  weight?: number;
  duration?: number;
  distance?: number;
  completed: boolean;
  completedAt?: Date;
  type: 'warmup' | 'working' | 'dropset' | 'failure';
}

// Zustand store for active workout session
import create from 'zustand';
import { persist } from 'zustand/middleware';

interface WorkoutSessionState {
  activeSession: WorkoutSession | null;
  currentExerciseIndex: number;
  isRestTimerActive: boolean;
  restTimeRemaining: number;

  // Actions
  startWorkout: (template?: WorkoutTemplate) => void;
  endWorkout: () => Promise<void>;
  addExercise: (exercise: Exercise) => void;
  removeExercise: (index: number) => void;
  reorderExercises: (fromIndex: number, toIndex: number) => void;
  addSet: (exerciseIndex: number) => void;
  updateSet: (exerciseIndex: number, setIndex: number, data: Partial<SetInSession>) => void;
  completeSet: (exerciseIndex: number, setIndex: number) => void;
  deleteSet: (exerciseIndex: number, setIndex: number) => void;
  startRestTimer: (duration: number) => void;
  stopRestTimer: () => void;
  updateNotes: (notes: string) => void;
}

export const useWorkoutSession = create<WorkoutSessionState>()(
  persist(
    (set, get) => ({
      activeSession: null,
      currentExerciseIndex: 0,
      isRestTimerActive: false,
      restTimeRemaining: 0,

      startWorkout: (template) => {
        const session: WorkoutSession = {
          id: generateId(),
          templateId: template?.id,
          startTime: new Date(),
          exercises: template?.exercises.map(ex => ({
            id: generateId(),
            exerciseId: ex.id,
            name: ex.name,
            sets: ex.defaultSets?.map((s, i) => ({
              id: generateId(),
              setNumber: i + 1,
              reps: s.reps,
              weight: s.weight,
              completed: false,
              type: 'working',
            })) || [],
            restTimer: ex.defaultRestTime,
          })) || [],
          duration: 0,
        };

        set({ activeSession: session, currentExerciseIndex: 0 });

        // Start duration tracking
        startDurationTracking();
      },

      endWorkout: async () => {
        const session = get().activeSession;
        if (!session) return;

        const endTime = new Date();
        const duration = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000);

        const completedSession = {
          ...session,
          endTime,
          duration,
        };

        // Save to database
        await saveWorkoutToDatabase(completedSession);

        // Upload to server
        await syncWorkoutWithServer(completedSession);

        // Calculate achievements
        await checkForAchievements(completedSession);

        set({
          activeSession: null,
          currentExerciseIndex: 0,
          isRestTimerActive: false,
          restTimeRemaining: 0,
        });
      },

      completeSet: (exerciseIndex, setIndex) => {
        set((state) => {
          if (!state.activeSession) return state;

          const exercises = [...state.activeSession.exercises];
          const sets = [...exercises[exerciseIndex].sets];
          sets[setIndex] = {
            ...sets[setIndex],
            completed: true,
            completedAt: new Date(),
          };
          exercises[exerciseIndex] = {
            ...exercises[exerciseIndex],
            sets,
          };

          const updatedSession = {
            ...state.activeSession,
            exercises,
          };

          // Auto-start rest timer if configured
          const restTime = exercises[exerciseIndex].restTimer;
          if (restTime && restTime > 0) {
            get().startRestTimer(restTime);
          }

          // Haptic feedback
          triggerHaptic('medium');

          return { activeSession: updatedSession };
        });
      },

      addSet: (exerciseIndex) => {
        set((state) => {
          if (!state.activeSession) return state;

          const exercises = [...state.activeSession.exercises];
          const currentSets = exercises[exerciseIndex].sets;
          const lastSet = currentSets[currentSets.length - 1];

          const newSet: SetInSession = {
            id: generateId(),
            setNumber: currentSets.length + 1,
            reps: lastSet?.reps,
            weight: lastSet?.weight,
            completed: false,
            type: 'working',
          };

          exercises[exerciseIndex] = {
            ...exercises[exerciseIndex],
            sets: [...currentSets, newSet],
          };

          return {
            activeSession: {
              ...state.activeSession,
              exercises,
            },
          };
        });
      },

      startRestTimer: (duration) => {
        set({ isRestTimerActive: true, restTimeRemaining: duration });

        const interval = setInterval(() => {
          const remaining = get().restTimeRemaining - 1;

          if (remaining <= 0) {
            clearInterval(interval);
            set({ isRestTimerActive: false, restTimeRemaining: 0 });
            triggerHaptic('heavy');
            playSound('rest-complete');
            showRestCompleteNotification();
          } else {
            set({ restTimeRemaining: remaining });
          }
        }, 1000);
      },

      // ... other actions
    }),
    {
      name: 'workout-session',
      // Persist to MMKV for instant recovery after app restart
      getStorage: () => ({
        getItem: (name) => MMKV.getString(name) ?? null,
        setItem: (name, value) => MMKV.set(name, value),
        removeItem: (name) => MMKV.delete(name),
      }),
    }
  )
);
```

---

## Database Schema & Sync Strategy

### Realm Schema (Offline-First)

```typescript
import Realm from 'realm';

// Workout schema
class WorkoutSchema extends Realm.Object {
  static schema: Realm.ObjectSchema = {
    name: 'Workout',
    primaryKey: '_id',
    properties: {
      _id: 'string',
      userId: 'string',
      name: 'string?',
      templateId: 'string?',
      startTime: 'date',
      endTime: 'date?',
      duration: 'int',
      volume: 'double', // Total weight lifted
      exercises: 'WorkoutExercise[]',
      notes: 'string?',
      bodyweight: 'double?',
      synced: { type: 'bool', default: false },
      syncedAt: 'date?',
      updatedAt: 'date',
      deletedAt: 'date?',
    },
  };
}

class WorkoutExerciseSchema extends Realm.Object {
  static schema: Realm.ObjectSchema = {
    name: 'WorkoutExercise',
    embedded: true,
    properties: {
      exerciseId: 'string',
      name: 'string',
      sets: 'WorkoutSet[]',
      notes: 'string?',
      restTimer: 'int?',
    },
  };
}

class WorkoutSetSchema extends Realm.Object {
  static schema: Realm.ObjectSchema = {
    name: 'WorkoutSet',
    embedded: true,
    properties: {
      setNumber: 'int',
      reps: 'int?',
      weight: 'double?',
      duration: 'int?',
      distance: 'double?',
      type: 'string',
      completed: 'bool',
      completedAt: 'date?',
    },
  };
}

// Exercise database
class ExerciseSchema extends Realm.Object {
  static schema: Realm.ObjectSchema = {
    name: 'Exercise',
    primaryKey: '_id',
    properties: {
      _id: 'string',
      name: 'string',
      category: 'string',
      muscleGroups: 'string[]',
      equipment: 'string[]',
      instructions: 'string?',
      videoUrl: 'string?',
      thumbnailUrl: 'string?',
      defaultRestTime: 'int?',
      isFavorite: { type: 'bool', default: false },
      lastUsed: 'date?',
      useCount: { type: 'int', default: 0 },
    },
  };
}

// Initialize Realm
export const initializeDatabase = async (): Promise<Realm> => {
  const realm = await Realm.open({
    schema: [
      WorkoutSchema,
      WorkoutExerciseSchema,
      WorkoutSetSchema,
      ExerciseSchema,
      // ... other schemas
    ],
    schemaVersion: 5,
    migration: (oldRealm, newRealm) => {
      // Handle schema migrations
      if (oldRealm.schemaVersion < 5) {
        const oldObjects = oldRealm.objects('Workout');
        const newObjects = newRealm.objects('Workout');

        for (let i = 0; i < oldObjects.length; i++) {
          // Migrate data
          newObjects[i].volume = calculateVolume(oldObjects[i]);
        }
      }
    },
  });

  return realm;
};
```

### Sync Strategy

```typescript
// Bidirectional sync with conflict resolution
class SyncService {
  private realm: Realm;
  private syncQueue: Map<string, SyncOperation> = new Map();

  async syncWorkouts() {
    // 1. Get unsynced local changes
    const unsyncedWorkouts = this.realm
      .objects<WorkoutSchema>('Workout')
      .filtered('synced == false AND deletedAt == null');

    // 2. Upload local changes
    for (const workout of unsyncedWorkouts) {
      try {
        await this.uploadWorkout(workout);

        // Mark as synced
        this.realm.write(() => {
          workout.synced = true;
          workout.syncedAt = new Date();
        });
      } catch (error) {
        console.error('Sync failed:', error);
        // Queue for retry
        this.addToSyncQueue(workout._id);
      }
    }

    // 3. Download server changes
    const lastSyncTime = await this.getLastSyncTime();
    const serverChanges = await this.fetchServerChanges(lastSyncTime);

    // 4. Apply server changes with conflict resolution
    for (const serverWorkout of serverChanges) {
      await this.applyServerChange(serverWorkout);
    }

    // 5. Update last sync time
    await this.setLastSyncTime(new Date());
  }

  private async applyServerChange(serverWorkout: any) {
    const localWorkout = this.realm.objectForPrimaryKey<WorkoutSchema>(
      'Workout',
      serverWorkout._id
    );

    if (!localWorkout) {
      // New workout from server - insert
      this.realm.write(() => {
        this.realm.create('Workout', {
          ...serverWorkout,
          synced: true,
        });
      });
    } else {
      // Conflict resolution
      if (serverWorkout.updatedAt > localWorkout.updatedAt) {
        // Server version is newer
        this.realm.write(() => {
          Object.assign(localWorkout, {
            ...serverWorkout,
            synced: true,
          });
        });
      } else if (serverWorkout.updatedAt < localWorkout.updatedAt && !localWorkout.synced) {
        // Local version is newer - upload
        await this.uploadWorkout(localWorkout);
      }
      // If times are equal, keep local version
    }
  }

  private async uploadWorkout(workout: WorkoutSchema) {
    const workoutData = JSON.parse(JSON.stringify(workout));

    const response = await fetch(`${API_URL}/workouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`,
      },
      body: JSON.stringify(workoutData),
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    return response.json();
  }

  // Background sync
  async setupBackgroundSync() {
    BackgroundFetch.configure(
      {
        minimumFetchInterval: 15,
        stopOnTerminate: false,
        startOnBoot: true,
      },
      async (taskId) => {
        console.log('Background sync triggered');

        try {
          await this.syncWorkouts();
          BackgroundFetch.finish(taskId);
        } catch (error) {
          BackgroundFetch.finish(taskId);
        }
      }
    );
  }
}
```

---

## Exercise Video Delivery System

### Smart Video Loading Strategy

```typescript
// Multi-tier video delivery
class VideoDeliveryService {
  private cdnBaseUrl = 'https://cdn.hevy.com/videos';
  private cache: Map<string, string> = new Map();

  // 1. Thumbnail preview (always loaded)
  getThumbnailUrl(exerciseId: string): string {
    return `${this.cdnBaseUrl}/thumbnails/${exerciseId}.jpg`;
  }

  // 2. Low-quality preview (for quick loading)
  getLowQualityVideoUrl(exerciseId: string): string {
    return `${this.cdnBaseUrl}/preview/${exerciseId}_360p.mp4`;
  }

  // 3. Adaptive quality selection
  async getVideoUrl(exerciseId: string): Promise<string> {
    const quality = await this.determineOptimalQuality();
    return `${this.cdnBaseUrl}/${quality}/${exerciseId}_${quality}.mp4`;
  }

  private async determineOptimalQuality(): Promise<'360p' | '720p' | '1080p'> {
    const netInfo = await NetInfo.fetch();

    // Check connection type
    if (netInfo.type === 'wifi') {
      return '1080p';
    }

    if (netInfo.type === 'cellular') {
      const generation = netInfo.details?.cellularGeneration;

      switch (generation) {
        case '5g':
          return '1080p';
        case '4g':
          return '720p';
        case '3g':
        default:
          return '360p';
      }
    }

    return '720p';
  }

  // 4. Prefetch strategy
  async prefetchExerciseVideos(exerciseIds: string[]) {
    // Only prefetch on WiFi
    const netInfo = await NetInfo.fetch();
    if (netInfo.type !== 'wifi') return;

    // Prefetch thumbnails first
    await Promise.all(
      exerciseIds.slice(0, 10).map(id =>
        FastImage.preload([{ uri: this.getThumbnailUrl(id) }])
      )
    );

    // Then prefetch low-quality videos for next 5 exercises
    for (const exerciseId of exerciseIds.slice(0, 5)) {
      const url = this.getLowQualityVideoUrl(exerciseId);
      await this.downloadToCache(exerciseId, url);
    }
  }

  private async downloadToCache(exerciseId: string, url: string): Promise<void> {
    const localPath = `${RNFS.CachesDirectoryPath}/videos/${exerciseId}.mp4`;

    // Check if already cached
    const exists = await RNFS.exists(localPath);
    if (exists) {
      this.cache.set(exerciseId, localPath);
      return;
    }

    // Download in background
    try {
      await RNFS.downloadFile({
        fromUrl: url,
        toFile: localPath,
        background: true,
        discretionary: true,
        cacheable: true,
      }).promise;

      this.cache.set(exerciseId, localPath);
    } catch (error) {
      console.error('Video cache download failed:', error);
    }
  }

  // 5. Get cached or remote URL
  async getVideoSource(exerciseId: string): Promise<{ uri: string }> {
    // Check cache first
    const cachedPath = this.cache.get(exerciseId);
    if (cachedPath) {
      const exists = await RNFS.exists(cachedPath);
      if (exists) {
        return { uri: `file://${cachedPath}` };
      }
    }

    // Fall back to remote URL
    const remoteUrl = await this.getVideoUrl(exerciseId);
    return { uri: remoteUrl };
  }
}

// Usage in component
const ExerciseVideoPlayer = ({ exerciseId }: { exerciseId: string }) => {
  const [videoSource, setVideoSource] = useState<{ uri: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadVideo = async () => {
      try {
        const source = await videoDeliveryService.getVideoSource(exerciseId);
        if (mounted) {
          setVideoSource(source);
        }
      } catch (error) {
        console.error('Failed to load video:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadVideo();

    return () => {
      mounted = false;
    };
  }, [exerciseId]);

  if (loading || !videoSource) {
    return (
      <View style={styles.placeholder}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Video
      source={videoSource}
      style={styles.video}
      resizeMode="cover"
      repeat={true}
      muted={true}
      paused={false}
      onError={(error) => console.error('Video error:', error)}
      onLoad={() => console.log('Video loaded')}
    />
  );
};
```

---

## Progressive Data Loading Pattern

```typescript
// Hevy's approach to loading workout history efficiently

interface WorkoutHistoryPage {
  workouts: Workout[];
  nextCursor?: string;
  hasMore: boolean;
}

// React Query infinite query pattern
import { useInfiniteQuery } from '@tanstack/react-query';

export const useWorkoutHistory = () => {
  return useInfiniteQuery<WorkoutHistoryPage>({
    queryKey: ['workout-history'],
    queryFn: async ({ pageParam = null }) => {
      // Try local database first
      const localWorkouts = await getLocalWorkouts(pageParam, 20);

      // If we have local data, return immediately
      if (localWorkouts.length > 0) {
        return {
          workouts: localWorkouts,
          nextCursor: localWorkouts[localWorkouts.length - 1]._id,
          hasMore: true,
        };
      }

      // Otherwise fetch from server
      const response = await fetch(
        `${API_URL}/workouts?cursor=${pageParam || ''}&limit=20`
      );
      const data = await response.json();

      // Save to local database for offline access
      await saveWorkoutsToLocal(data.workouts);

      return data;
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
};

// Component with infinite scroll
const WorkoutHistoryScreen = () => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useWorkoutHistory();

  const workouts = useMemo(
    () => data?.pages.flatMap(page => page.workouts) ?? [],
    [data]
  );

  const renderItem = useCallback(({ item }: { item: Workout }) => (
    <WorkoutCard workout={item} />
  ), []);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <FlashList
      data={workouts}
      renderItem={renderItem}
      estimatedItemSize={120}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? <LoadingSpinner /> : null
      }
    />
  );
};
```

---

## Platform-Specific Health Integration

### iOS HealthKit Integration

```swift
// ios/HealthKitManager.swift
import HealthKit

@objc(HealthKitManager)
class HealthKitManager: NSObject {

  let healthStore = HKHealthStore()

  @objc
  func requestAuthorization(_ resolve: @escaping RCTPromiseResolveBlock,
                           rejecter reject: @escaping RCTPromiseRejectBlock) {

    guard HKHealthStore.isHealthDataAvailable() else {
      reject("unavailable", "HealthKit is not available", nil)
      return
    }

    let workoutType = HKObjectType.workoutType()
    let energyType = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!
    let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate)!

    let typesToShare: Set<HKSampleType> = [workoutType, energyType]
    let typesToRead: Set<HKObjectType> = [workoutType, energyType, heartRateType]

    healthStore.requestAuthorization(toShare: typesToShare, read: typesToRead) { success, error in
      if success {
        resolve(true)
      } else {
        reject("error", error?.localizedDescription ?? "Unknown error", nil)
      }
    }
  }

  @objc
  func saveWorkout(_ workoutData: NSDictionary,
                   resolver resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {

    let startDate = Date(timeIntervalSince1970: workoutData["startTime"] as! TimeInterval)
    let endDate = Date(timeIntervalSince1970: workoutData["endTime"] as! TimeInterval)
    let calories = workoutData["calories"] as? Double ?? 0

    let energyBurned = HKQuantity(unit: .kilocalorie(), doubleValue: calories)

    let workout = HKWorkout(
      activityType: .traditionalStrengthTraining,
      start: startDate,
      end: endDate,
      duration: endDate.timeIntervalSince(startDate),
      totalEnergyBurned: energyBurned,
      totalDistance: nil,
      metadata: [
        "app": "Hevy",
        "workout_id": workoutData["id"] as! String
      ]
    )

    healthStore.save(workout) { success, error in
      if success {
        resolve(true)
      } else {
        reject("error", error?.localizedDescription ?? "Failed to save workout", nil)
      }
    }
  }
}
```

### Android Google Fit Integration

```kotlin
// android/app/src/main/java/com/hevy/GoogleFitManager.kt
class GoogleFitManager(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val fitnessOptions = FitnessOptions.builder()
    .addDataType(DataType.TYPE_WORKOUT_EXERCISE, FitnessOptions.ACCESS_WRITE)
    .addDataType(DataType.TYPE_CALORIES_EXPENDED, FitnessOptions.ACCESS_WRITE)
    .build()

  @ReactMethod
  fun requestAuthorization(promise: Promise) {
    val account = GoogleSignIn.getAccountForExtension(reactContext, fitnessOptions)

    if (!GoogleSignIn.hasPermissions(account, fitnessOptions)) {
      GoogleSignIn.requestPermissions(
        currentActivity,
        REQUEST_OAUTH_REQUEST_CODE,
        account,
        fitnessOptions
      )
    } else {
      promise.resolve(true)
    }
  }

  @ReactMethod
  fun saveWorkout(workoutData: ReadableMap, promise: Promise) {
    val account = GoogleSignIn.getAccountForExtension(reactContext, fitnessOptions)

    val startTime = workoutData.getDouble("startTime").toLong()
    val endTime = workoutData.getDouble("endTime").toLong()
    val calories = workoutData.getDouble("calories").toFloat()

    val session = Session.Builder()
      .setName(workoutData.getString("name"))
      .setDescription("Workout tracked by Hevy")
      .setIdentifier(workoutData.getString("id"))
      .setActivity(FitnessActivities.STRENGTH_TRAINING)
      .setStartTime(startTime, TimeUnit.MILLISECONDS)
      .setEndTime(endTime, TimeUnit.MILLISECONDS)
      .build()

    val sessionInsertRequest = SessionInsertRequest.Builder()
      .setSession(session)
      .addDataSet(createCaloriesDataSet(startTime, endTime, calories))
      .build()

    Fitness.getSessionsClient(reactContext, account)
      .insertSession(sessionInsertRequest)
      .addOnSuccessListener {
        promise.resolve(true)
      }
      .addOnFailureListener { e ->
        promise.reject("ERROR", e.message)
      }
  }

  private fun createCaloriesDataSet(
    startTime: Long,
    endTime: Long,
    calories: Float
  ): DataSet {
    val dataSource = DataSource.Builder()
      .setAppPackageName(reactContext.packageName)
      .setDataType(DataType.TYPE_CALORIES_EXPENDED)
      .setType(DataSource.TYPE_RAW)
      .build()

    val dataPoint = DataPoint.builder(dataSource)
      .setTimeInterval(startTime, endTime, TimeUnit.MILLISECONDS)
      .setField(Field.FIELD_CALORIES, calories)
      .build()

    return DataSet.builder(dataSource)
      .add(dataPoint)
      .build()
  }
}
```

---

## Key Insights Summary

### What Hevy Does Exceptionally Well

1. **Instant Responsiveness**
   - Optimistic UI updates
   - MMKV for instant persistence
   - Background sync without blocking UI

2. **Smart Resource Management**
   - Lazy video loading
   - Aggressive image caching
   - Memory-efficient list rendering

3. **Native Integration**
   - HealthKit and Google Fit sync
   - Watch app connectivity
   - Platform-specific UI patterns

4. **Offline Reliability**
   - Realm for robust local storage
   - Conflict resolution
   - Queue-based sync

5. **Performance Optimization**
   - Reanimated for smooth animations
   - FlashList for efficient scrolling
   - Native modules for heavy lifting

### Application to full_tracker Project

The patterns from Hevy can be directly applied:

1. **Use Zustand + MMKV** for workout session state (replace localStorage)
2. **Implement Realm or WatermelonDB** for offline-first data
3. **Adopt FlashList** for all workout/exercise lists
4. **Use Reanimated 3** for rest timer and progress animations
5. **Implement progressive loading** for workout history
6. **Add optimistic updates** for immediate feedback
7. **Build platform-specific health integrations**

These patterns will transform full_tracker into a production-ready, native-quality fitness app.
