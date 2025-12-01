# SPEC-FITNESS-001: Implementation Plan

<!-- TAG:SPEC-FITNESS-001:PLAN -->

---

## Overview

This plan outlines the implementation strategy for completing the Fitness Module, focusing on the ActiveWorkout component and supporting features.

**Primary Goal**: Complete core workout logging functionality
**Secondary Goal**: Add advanced features (templates, supersets)

---

## Milestone 1: Personal Record System (Priority: HIGH)

### M1.1: PR Detection Enhancement

**Objective**: Replace console.log with proper PR notification system

**Files to Modify**:
- `components/workouts/ActiveWorkout.tsx`

**Technical Approach**:

1. **Create PR Badge Component**:
```typescript
// components/workouts/PRBadge.tsx
interface PRBadgeProps {
  type: 'weight' | 'volume' | 'reps';
  improvement: string;
}

export function PRBadge({ type, improvement }: PRBadgeProps) {
  return (
    <Badge variant="default" className="bg-yellow-500 text-black">
      <Trophy className="h-3 w-3 mr-1" />
      PR {type === 'weight' ? 'Weight' : type === 'volume' ? 'Volume' : 'Reps'}
      <span className="ml-1 text-xs">+{improvement}</span>
    </Badge>
  );
}
```

2. **Add Toast Notification**:
```typescript
// In ActiveWorkout.tsx logSet function
const data = await response.json();
if (data.isPersonalRecord) {
  toast({
    title: "Personal Record!",
    description: `New ${data.recordType} PR for ${currentExercise.name}`,
    action: <ToastAction altText="View">View</ToastAction>,
  });

  // Update local state to show PR badge
  setSets(prev => ({
    ...prev,
    [currentExercise.id]: prev[currentExercise.id].map((set, idx) =>
      idx === prev[currentExercise.id].length - 1
        ? { ...set, isPersonalRecord: true, recordType: data.recordType }
        : set
    ),
  }));
}
```

3. **Display PR Badge on Completed Sets**:
```typescript
// In completed sets display
{set.isPersonalRecord && (
  <PRBadge type={set.recordType} improvement={set.improvement} />
)}
```

### M1.2: PR Tracking State

**Add PR tracking to session state**:
```typescript
interface WorkoutSet {
  // ... existing fields
  isPersonalRecord?: boolean;
  recordType?: 'weight' | 'volume' | 'reps';
  improvement?: string;
}

const [sessionPRs, setSessionPRs] = useState<PRNotification[]>([]);
```

---

## Milestone 2: Set Auto-Population (Priority: HIGH)

### M2.1: Previous Set Data Integration

**Objective**: Pre-fill weight/reps from previous session

**Files to Modify**:
- `components/workouts/ActiveWorkout.tsx`

**Technical Approach**:

1. **Modify getPreviousPerformance to return next target**:
```typescript
const getPreviousPerformance = useCallback(async (exerciseId: number) => {
  const response = await fetch(`/api/v1/exercises/${exerciseId}/last-performance`);
  const data = await response.json();

  return {
    sets: data.sets,
    lastPerformedAt: data.lastPerformedAt,
    // Add suggested next set based on previous
    suggestedNext: data.sets.length > 0 ? {
      weight: data.sets[0].weight,
      reps: data.sets[0].reps,
    } : null,
  };
}, []);
```

2. **Auto-populate current set from previous**:
```typescript
// When switching exercises or after completing a set
useEffect(() => {
  const perf = previousPerformance[currentExerciseId];
  const completedSets = sets[currentExerciseId]?.length || 0;
  const nextSetIndex = completedSets;

  if (perf?.sets?.[nextSetIndex]) {
    const prevSet = perf.sets[nextSetIndex];
    setCurrentSet({
      weight: prevSet.weight || 0,
      reps: prevSet.reps || 10,
      setType: 'normal',
    });
  }
}, [currentExerciseId, sets, previousPerformance]);
```

---

## Milestone 3: Ad-Hoc Exercise Addition (Priority: MEDIUM)

### M3.1: Exercise Search Component

**Files to Create**:
- `components/workouts/ExerciseSearch.tsx`

**Technical Approach**:

```typescript
// components/workouts/ExerciseSearch.tsx
interface ExerciseSearchProps {
  onSelect: (exercise: Exercise) => void;
  excludeIds?: number[];
}

export function ExerciseSearch({ onSelect, excludeIds = [] }: ExerciseSearchProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [muscle, setMuscle] = useState<string | null>(null);
  const [results, setResults] = useState<Exercise[]>([]);

  // Fetch exercises with debounced search
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (category) params.set('category', category);
    if (muscle) params.set('muscle', muscle);

    fetch(`/api/v1/exercises/search?${params}`)
      .then(res => res.json())
      .then(data => setResults(data.exercises.filter(e => !excludeIds.includes(e.id))));
  }, [search, category, muscle, excludeIds]);

  return (
    <Dialog>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Exercise</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="flex gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="strength">Strength</SelectItem>
                <SelectItem value="cardio">Cardio</SelectItem>
                <SelectItem value="flexibility">Flexibility</SelectItem>
              </SelectContent>
            </Select>

            <Select value={muscle} onValueChange={setMuscle}>
              <SelectTrigger><SelectValue placeholder="Muscle" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="chest">Chest</SelectItem>
                <SelectItem value="back">Back</SelectItem>
                <SelectItem value="legs">Legs</SelectItem>
                {/* ... more muscles */}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-64">
            {results.map(exercise => (
              <Button
                key={exercise.id}
                variant="ghost"
                className="w-full justify-start"
                onClick={() => onSelect(exercise)}
              >
                <div>
                  <div className="font-medium">{exercise.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {exercise.category} - {exercise.primary_muscle}
                  </div>
                </div>
              </Button>
            ))}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### M3.2: Add Exercise API Endpoint

**Files to Create**:
- `app/api/v1/exercises/search/route.ts`

```typescript
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const category = searchParams.get('category');
  const muscle = searchParams.get('muscle');

  let query = 'SELECT * FROM fitness_exercises WHERE 1=1';
  const params: any[] = [];

  if (q) {
    params.push(`%${q}%`);
    query += ` AND name ILIKE $${params.length}`;
  }
  if (category) {
    params.push(category);
    query += ` AND category = $${params.length}`;
  }
  if (muscle) {
    params.push(muscle);
    query += ` AND primary_muscle = $${params.length}`;
  }

  query += ' ORDER BY name LIMIT 50';

  const result = await pool.query(query, params);
  return NextResponse.json({ exercises: result.rows });
}
```

### M3.3: Integrate with ActiveWorkout

**Modify ActiveWorkout.tsx**:
```typescript
const [showExerciseSearch, setShowExerciseSearch] = useState(false);

const handleAddExercise = async (exercise: Exercise) => {
  // Add to backend
  const response = await fetch(`/api/v1/workouts/${sessionId}/exercises`, {
    method: 'POST',
    body: JSON.stringify({ exerciseId: exercise.id }),
  });

  const { workoutExerciseId } = await response.json();

  // Add to local state
  const newExercise = { ...exercise, workoutExerciseId };
  setExercises(prev => [...prev, newExercise]);
  setShowExerciseSearch(false);
};

// In tabs list
<TabsList>
  {exercises.map(/* ... */)}
  <Button variant="ghost" size="sm" onClick={() => setShowExerciseSearch(true)}>
    <Plus className="h-4 w-4" />
  </Button>
</TabsList>
```

---

## Milestone 4: Workout Summary (Priority: MEDIUM)

### M4.1: Summary Component

**Files to Create**:
- `components/workouts/WorkoutSummary.tsx`

**Technical Approach**:

```typescript
interface WorkoutSummaryProps {
  sessionId: number;
  duration: number;
  exercises: Exercise[];
  sets: Record<number, WorkoutSet[]>;
  personalRecords: PRNotification[];
  onClose: () => void;
}

export function WorkoutSummary({
  sessionId,
  duration,
  exercises,
  sets,
  personalRecords,
  onClose,
}: WorkoutSummaryProps) {
  const totalSets = Object.values(sets).flat().length;
  const totalReps = Object.values(sets).flat().reduce((sum, s) => sum + s.reps, 0);
  const totalVolume = Object.values(sets).flat().reduce(
    (sum, s) => sum + (s.weight * s.reps),
    0
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Workout Complete!</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Duration */}
          <div className="flex items-center justify-center gap-2 text-2xl">
            <Clock className="h-6 w-6" />
            <span>{formatDuration(duration)}</span>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{exercises.length}</div>
              <div className="text-sm text-muted-foreground">Exercises</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{totalSets}</div>
              <div className="text-sm text-muted-foreground">Sets</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{totalVolume.toLocaleString()}kg</div>
              <div className="text-sm text-muted-foreground">Volume</div>
            </div>
          </div>

          {/* Personal Records */}
          {personalRecords.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Personal Records ({personalRecords.length})
              </h3>
              <div className="space-y-1">
                {personalRecords.map((pr, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{pr.exerciseName}</span>
                    <span className="text-yellow-600">
                      {pr.recordType}: {pr.newValue}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exercise Breakdown */}
          <div className="space-y-2">
            <h3 className="font-medium">Exercise Breakdown</h3>
            {exercises.map(exercise => {
              const exerciseSets = sets[exercise.id] || [];
              const exerciseVolume = exerciseSets.reduce(
                (sum, s) => sum + (s.weight * s.reps),
                0
              );
              return (
                <div key={exercise.id} className="flex justify-between text-sm">
                  <span>{exercise.name}</span>
                  <span className="text-muted-foreground">
                    {exerciseSets.length} sets - {exerciseVolume}kg
                  </span>
                </div>
              );
            })}
          </div>

          <Button className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### M4.2: Integrate with ActiveWorkout

```typescript
const [showSummary, setShowSummary] = useState(false);

const handleCompleteWorkout = async () => {
  // Mark workout as complete in backend
  await fetch(`/api/v1/workouts/${sessionId}/complete`, { method: 'POST' });

  // Show summary
  setShowSummary(true);
};

// Replace onComplete call
<Button variant="destructive" onClick={handleCompleteWorkout}>
  End Workout
</Button>

{showSummary && (
  <WorkoutSummary
    sessionId={sessionId}
    duration={workoutDuration}
    exercises={exercises}
    sets={sets}
    personalRecords={sessionPRs}
    onClose={() => {
      setShowSummary(false);
      onComplete();
    }}
  />
)}
```

---

## Milestone 5: Workout Templates (Priority: LOW)

### M5.1: Template Database Schema Check

**Verify existing schema or add**:
```sql
-- May need to add if not exists
CREATE TABLE IF NOT EXISTS fitness_workout_templates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER DEFAULT 1,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fitness_template_exercises (
  id SERIAL PRIMARY KEY,
  template_id INTEGER REFERENCES fitness_workout_templates(id) ON DELETE CASCADE,
  exercise_id INTEGER REFERENCES fitness_exercises(id),
  order_index INTEGER NOT NULL,
  target_sets INTEGER DEFAULT 3,
  target_reps VARCHAR(50),
  notes TEXT
);
```

### M5.2: Template API Endpoints

**Files to Create**:
- `app/api/v1/workout-templates/route.ts`
- `app/api/v1/workout-templates/[id]/route.ts`

### M5.3: Template Manager Component

**Files to Create**:
- `components/workouts/TemplateManager.tsx`
- `app/workouts/templates/page.tsx`

---

## Milestone 6: Superset Support (Priority: LOW)

### M6.1: Superset State Management

**Add to ActiveWorkout state**:
```typescript
const [supersets, setSupersets] = useState<number[][]>([]);

// Example: [[1, 2], [4, 5]] means exercises 1&2 are a superset, 4&5 are another
```

### M6.2: Superset UI

- Visual grouping of superset exercises
- Shared rest timer
- Superset indicator badges

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| PR detection false positives | Medium | Low | Verify calculation logic |
| State management complexity | Medium | Medium | Use reducer pattern if needed |
| Mobile performance | Low | Medium | Optimize re-renders |
| API latency during workout | Low | High | Optimistic updates |

---

## Verification Checklist

### PR System
- [ ] Toast notification appears on PR
- [ ] PR badge displays on completed set
- [ ] PR saved to database
- [ ] Multiple PR types detected correctly

### Auto-Population
- [ ] Weight pre-filled from previous session
- [ ] Reps pre-filled from previous session
- [ ] Handles first-time exercise correctly

### Exercise Addition
- [ ] Search modal opens
- [ ] Filters work correctly
- [ ] Exercise added to current workout
- [ ] Can log sets for added exercise

### Summary
- [ ] Shows after workout completion
- [ ] Stats calculated correctly
- [ ] PRs displayed
- [ ] Exercise breakdown accurate

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-28 | spec-builder | Initial plan creation |
