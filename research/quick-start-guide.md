# Quick Start Guide: Implementing Hevy-Inspired Features

## For Developers Who Want to Start Immediately

This guide provides copy-paste ready code snippets to start implementing Hevy-style features in your app.

---

## 1. Setup React Native Project (5 minutes)

```bash
# Create new React Native TypeScript project
npx react-native@latest init full_tracker_mobile --template react-native-template-typescript

cd full_tracker_mobile

# Install essential dependencies
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
npm install zustand react-native-mmkv
npm install @tanstack/react-query
npm install @shopify/flash-list
npm install react-native-reanimated react-native-gesture-handler

# iOS specific (if on Mac)
cd ios && pod install && cd ..

# Start development
npm run android  # or npm run ios
```

---

## 2. Setup State Management (10 minutes)

### File: `src/store/workoutStore.ts`

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

interface Exercise {
  id: string;
  name: string;
  sets: Set[];
}

interface Set {
  id: string;
  reps: number;
  weight: number;
  completed: boolean;
}

interface WorkoutSession {
  id: string;
  startTime: Date;
  exercises: Exercise[];
}

interface WorkoutStore {
  activeWorkout: WorkoutSession | null;
  isRestTimerActive: boolean;
  restTimeRemaining: number;

  startWorkout: () => void;
  endWorkout: () => void;
  addExercise: (name: string) => void;
  addSet: (exerciseId: string) => void;
  completeSet: (exerciseId: string, setId: string, reps: number, weight: number) => void;
  startRestTimer: (duration: number) => void;
}

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      activeWorkout: null,
      isRestTimerActive: false,
      restTimeRemaining: 0,

      startWorkout: () => {
        set({
          activeWorkout: {
            id: Date.now().toString(),
            startTime: new Date(),
            exercises: [],
          },
        });
      },

      endWorkout: () => {
        const workout = get().activeWorkout;
        if (workout) {
          // Save to database here
          console.log('Workout completed:', workout);
        }
        set({ activeWorkout: null });
      },

      addExercise: (name) => {
        const workout = get().activeWorkout;
        if (!workout) return;

        const newExercise: Exercise = {
          id: Date.now().toString(),
          name,
          sets: [],
        };

        set({
          activeWorkout: {
            ...workout,
            exercises: [...workout.exercises, newExercise],
          },
        });
      },

      addSet: (exerciseId) => {
        const workout = get().activeWorkout;
        if (!workout) return;

        const exerciseIndex = workout.exercises.findIndex(e => e.id === exerciseId);
        if (exerciseIndex === -1) return;

        const exercises = [...workout.exercises];
        const lastSet = exercises[exerciseIndex].sets[exercises[exerciseIndex].sets.length - 1];

        const newSet: Set = {
          id: Date.now().toString(),
          reps: lastSet?.reps || 0,
          weight: lastSet?.weight || 0,
          completed: false,
        };

        exercises[exerciseIndex] = {
          ...exercises[exerciseIndex],
          sets: [...exercises[exerciseIndex].sets, newSet],
        };

        set({ activeWorkout: { ...workout, exercises } });
      },

      completeSet: (exerciseId, setId, reps, weight) => {
        const workout = get().activeWorkout;
        if (!workout) return;

        const exercises = workout.exercises.map(exercise => {
          if (exercise.id !== exerciseId) return exercise;

          return {
            ...exercise,
            sets: exercise.sets.map(set =>
              set.id === setId
                ? { ...set, reps, weight, completed: true }
                : set
            ),
          };
        });

        set({ activeWorkout: { ...workout, exercises } });

        // Auto-start rest timer
        get().startRestTimer(90); // 90 seconds default
      },

      startRestTimer: (duration) => {
        set({ isRestTimerActive: true, restTimeRemaining: duration });

        const interval = setInterval(() => {
          const remaining = get().restTimeRemaining - 1;

          if (remaining <= 0) {
            clearInterval(interval);
            set({ isRestTimerActive: false, restTimeRemaining: 0 });
            // Trigger notification/haptic here
          } else {
            set({ restTimeRemaining: remaining });
          }
        }, 1000);
      },
    }),
    {
      name: 'workout-storage',
      storage: createJSONStorage(() => ({
        getItem: (name) => storage.getString(name) ?? null,
        setItem: (name, value) => storage.set(name, value),
        removeItem: (name) => storage.delete(name),
      })),
    }
  )
);
```

---

## 3. Create Active Workout Screen (15 minutes)

### File: `src/screens/ActiveWorkoutScreen.tsx`

```typescript
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { useWorkoutStore } from '../store/workoutStore';

export const ActiveWorkoutScreen = () => {
  const {
    activeWorkout,
    endWorkout,
    addExercise,
    addSet,
    completeSet,
    restTimeRemaining,
    isRestTimerActive,
  } = useWorkoutStore();

  const [exerciseName, setExerciseName] = React.useState('');
  const [selectedExercise, setSelectedExercise] = React.useState<string | null>(null);

  if (!activeWorkout) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No active workout</Text>
      </View>
    );
  }

  const handleAddExercise = () => {
    if (exerciseName.trim()) {
      addExercise(exerciseName);
      setExerciseName('');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Active Workout</Text>
        <TouchableOpacity onPress={endWorkout} style={styles.endButton}>
          <Text style={styles.endButtonText}>Finish</Text>
        </TouchableOpacity>
      </View>

      {/* Rest Timer */}
      {isRestTimerActive && (
        <View style={styles.restTimer}>
          <Text style={styles.restTimerText}>Rest: {restTimeRemaining}s</Text>
        </View>
      )}

      {/* Add Exercise */}
      <View style={styles.addExercise}>
        <TextInput
          style={styles.input}
          placeholder="Exercise name"
          value={exerciseName}
          onChangeText={setExerciseName}
        />
        <TouchableOpacity onPress={handleAddExercise} style={styles.addButton}>
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Exercise List */}
      <ScrollView style={styles.exerciseList}>
        {activeWorkout.exercises.map((exercise) => (
          <View key={exercise.id} style={styles.exerciseCard}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>

            {/* Sets */}
            {exercise.sets.map((set, index) => (
              <SetRow
                key={set.id}
                setNumber={index + 1}
                set={set}
                onComplete={(reps, weight) =>
                  completeSet(exercise.id, set.id, reps, weight)
                }
              />
            ))}

            {/* Add Set Button */}
            <TouchableOpacity
              onPress={() => addSet(exercise.id)}
              style={styles.addSetButton}
            >
              <Text style={styles.addSetButtonText}>+ Add Set</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const SetRow = ({
  setNumber,
  set,
  onComplete,
}: {
  setNumber: number;
  set: any;
  onComplete: (reps: number, weight: number) => void;
}) => {
  const [reps, setReps] = React.useState(set.reps.toString());
  const [weight, setWeight] = React.useState(set.weight.toString());

  const handleComplete = () => {
    onComplete(parseInt(reps) || 0, parseFloat(weight) || 0);
  };

  return (
    <View style={styles.setRow}>
      <Text style={styles.setNumber}>{setNumber}</Text>

      <TextInput
        style={styles.setInput}
        placeholder="Weight"
        keyboardType="numeric"
        value={weight}
        onChangeText={setWeight}
        editable={!set.completed}
      />

      <TextInput
        style={styles.setInput}
        placeholder="Reps"
        keyboardType="numeric"
        value={reps}
        onChangeText={setReps}
        editable={!set.completed}
      />

      <TouchableOpacity
        onPress={handleComplete}
        style={[
          styles.completeButton,
          set.completed && styles.completedButton,
        ]}
        disabled={set.completed}
      >
        <Text style={styles.completeButtonText}>
          {set.completed ? '✓' : '○'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  endButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  endButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  restTimer: {
    backgroundColor: '#FFC107',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  restTimerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  addExercise: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    backgroundColor: '#222',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  exerciseList: {
    flex: 1,
  },
  exerciseCard: {
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  setNumber: {
    color: '#888',
    fontSize: 16,
    width: 30,
  },
  setInput: {
    flex: 1,
    backgroundColor: '#222',
    color: '#fff',
    padding: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    textAlign: 'center',
  },
  completeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedButton: {
    backgroundColor: '#4CAF50',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  addSetButton: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  addSetButtonText: {
    color: '#888',
    textAlign: 'center',
  },
});
```

---

## 4. Setup React Query for Server Data (10 minutes)

### File: `src/api/client.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

// API functions
export const api = {
  async fetchWorkouts() {
    const response = await fetch('YOUR_API_URL/workouts');
    return response.json();
  },

  async saveWorkout(workout: any) {
    const response = await fetch('YOUR_API_URL/workouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workout),
    });
    return response.json();
  },
};
```

### File: `src/hooks/useWorkouts.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export const useWorkouts = () => {
  const queryClient = useQueryClient();

  const workoutsQuery = useQuery({
    queryKey: ['workouts'],
    queryFn: api.fetchWorkouts,
  });

  const saveWorkoutMutation = useMutation({
    mutationFn: api.saveWorkout,
    onMutate: async (newWorkout) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['workouts'] });

      // Snapshot previous value
      const previous = queryClient.getQueryData(['workouts']);

      // Optimistically update
      queryClient.setQueryData(['workouts'], (old: any[]) => [
        ...old,
        { ...newWorkout, id: 'temp-' + Date.now() },
      ]);

      return { previous };
    },
    onError: (err, newWorkout, context) => {
      // Rollback on error
      queryClient.setQueryData(['workouts'], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });

  return {
    workouts: workoutsQuery.data ?? [],
    isLoading: workoutsQuery.isLoading,
    saveWorkout: saveWorkoutMutation.mutate,
    isSaving: saveWorkoutMutation.isLoading,
  };
};
```

---

## 5. Add FlashList for Performance (5 minutes)

### File: `src/screens/WorkoutHistoryScreen.tsx`

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useWorkouts } from '../hooks/useWorkouts';

export const WorkoutHistoryScreen = () => {
  const { workouts, isLoading } = useWorkouts();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={workouts}
        renderItem={({ item }) => <WorkoutCard workout={item} />}
        estimatedItemSize={120}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};

const WorkoutCard = ({ workout }: { workout: any }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{workout.name || 'Workout'}</Text>
    <Text style={styles.cardDate}>
      {new Date(workout.startTime).toLocaleDateString()}
    </Text>
    <Text style={styles.cardInfo}>
      {workout.exercises?.length || 0} exercises
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loading: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 50,
  },
  card: {
    backgroundColor: '#111',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  cardInfo: {
    fontSize: 12,
    color: '#666',
  },
});
```

---

## 6. Setup App Structure (5 minutes)

### File: `App.tsx`

```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/api/client';
import { ActiveWorkoutScreen } from './src/screens/ActiveWorkoutScreen';
import { WorkoutHistoryScreen } from './src/screens/WorkoutHistoryScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#000' },
            headerTintColor: '#fff',
          }}
        >
          <Stack.Screen name="History" component={WorkoutHistoryScreen} />
          <Stack.Screen name="Workout" component={ActiveWorkoutScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  );
}
```

---

## Testing Your Implementation

```bash
# Run on Android
npm run android

# Run on iOS (Mac only)
npm run ios

# Test features:
1. Start a workout
2. Add exercises
3. Add sets
4. Complete sets (rest timer should start)
5. Finish workout
6. Check workout history
7. Close app and reopen (workout should persist)
```

---

## Next Steps

1. **Add Animations**: Implement Reanimated for smooth rest timer countdown
2. **Add Haptics**: Vibrate on set completion
3. **Add Camera**: For progress photos
4. **Add Push Notifications**: For workout reminders
5. **Add Offline Sync**: Using Realm database

See the full documentation in the research folder for complete implementations.

---

## Common Issues & Solutions

### Issue: Metro bundler errors

```bash
# Clear cache
npm start -- --reset-cache
```

### Issue: iOS build fails

```bash
cd ios
pod deintegrate
pod install
cd ..
```

### Issue: Android build fails

```bash
cd android
./gradlew clean
cd ..
```

---

## Performance Checklist

- [ ] Using FlashList for all lists
- [ ] Memoized components with React.memo
- [ ] Optimistic updates with React Query
- [ ] Persistent state with MMKV
- [ ] Native animations with Reanimated
- [ ] Proper keyboard handling
- [ ] Loading states for async operations
- [ ] Error handling for network failures

---

**You now have a working Hevy-inspired workout tracking app!**

Total setup time: ~50 minutes

For production features, refer to the detailed documentation in:
- `hevy-react-native-analysis.md`
- `hevy-implementation-patterns.md`
- `hevy-technical-recommendations.md`
