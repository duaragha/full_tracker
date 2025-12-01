# SPEC-FITNESS-001: Fitness Module Completion

<!-- TAG BLOCK -->
<!-- TAG:SPEC-FITNESS-001 -->
<!-- PARENT:none -->
<!-- STATUS:draft -->
<!-- PRIORITY:high -->
<!-- CREATED:2025-11-28 -->
<!-- UPDATED:2025-11-28 -->

---

## Environment

### Current System State

- **Framework**: Next.js 16.0.1 with App Router
- **Database**: PostgreSQL with fitness schema (migrations 031-032 applied)
- **UI Components**: shadcn/ui with Radix primitives
- **Current Implementation**: ~30% complete

### Existing Components

| Component | Location | Status | Lines |
|-----------|----------|--------|-------|
| ActiveWorkout | `components/workouts/ActiveWorkout.tsx` | Partial | 549 |
| Workouts Page | `app/workouts/page.tsx` | Basic | - |
| Fitness Actions | `lib/actions/fitness-workouts.ts` | Partial | - |
| API Endpoints | `app/api/v1/workouts/`, `app/api/v1/exercises/` | Basic | - |

### Database Schema (Already Exists)

```sql
-- From migrations 031-032
fitness_exercises (id, name, category, primary_muscle, equipment, ...)
fitness_workouts (id, user_id, name, started_at, completed_at, ...)
fitness_workout_exercises (id, workout_id, exercise_id, order_index, ...)
fitness_sets (id, workout_exercise_id, set_number, reps, weight_kg, rpe, ...)
fitness_personal_records (id, user_id, exercise_id, record_type, value, ...)
```

### Current ActiveWorkout Features

**Implemented**:
- Workout duration timer
- Rest timer between sets
- Set logging (reps, weight, RPE, set type)
- Previous session performance display
- Exercise tab navigation

**Missing**:
- PR notification UI (only console.log)
- Ad-hoc exercise addition
- Workout summary view
- Set history auto-population
- Superset support
- Workout templates

---

## Assumptions

### A1: Database Schema Sufficiency

- Existing fitness tables support all planned features
- No schema migrations required
- Personal records table can store multiple record types

### A2: API Endpoint Availability

- `/api/v1/workouts/[id]/sets` endpoint exists for set logging
- `/api/v1/exercises/[id]/last-performance` endpoint exists
- Additional endpoints may need creation

### A3: UI/UX Patterns

- Follow existing shadcn/ui patterns
- Mobile-first responsive design
- Toast notifications for feedback

### A4: Personal Records Definition

- Weight PR: Highest weight lifted for any rep count
- Volume PR: Highest weight x reps for a single set
- Rep PR: Most reps at a given weight

---

## Requirements

### R1: Personal Record Detection and Display (HIGH)

**EARS Pattern**: *Event-driven requirement*

**WHEN** a user completes a set that exceeds their previous best
**THE SYSTEM** SHALL:
1. Display a prominent PR notification (toast or modal)
2. Record the personal record in the database
3. Show a PR badge on the completed set

**SO THAT** achievements are tracked and celebrated.

**Current State**:
```typescript
// ActiveWorkout.tsx line 221-224
if (data.isPersonalRecord) {
  console.log('Personal Record!'); // Only console.log
}
```

**Target State**:
```typescript
if (data.isPersonalRecord) {
  toast({
    title: "Personal Record!",
    description: `New ${data.recordType} PR: ${data.weight}kg x ${data.reps}`,
    variant: "success",
  });
  // Update set display with PR badge
}
```

---

### R2: Ad-Hoc Exercise Addition (MEDIUM)

**EARS Pattern**: *State-driven requirement*

**WHILE** a workout session is active
**THE SYSTEM** SHALL allow adding exercises not in the current routine
**BY** providing an "Add Exercise" button that opens exercise search
**SO THAT** users can perform spontaneous exercises.

**Implementation**:
- Add "+" button in exercise tabs
- Open exercise search modal
- Filter by muscle group, equipment, or name
- Add selected exercise to current workout

---

### R3: Workout Summary View (MEDIUM)

**EARS Pattern**: *Event-driven requirement*

**WHEN** a workout session is completed
**THE SYSTEM** SHALL display a summary including:
- Total workout duration
- Number of exercises completed
- Total sets and reps
- Total volume (sum of weight x reps)
- Personal records achieved during session
- Comparison to previous session (if available)

**SO THAT** users can review their performance.

---

### R4: Set History Auto-Population (MEDIUM)

**EARS Pattern**: *Event-driven requirement*

**WHEN** a user starts logging a set for an exercise
**THE SYSTEM** SHALL pre-populate the weight and reps fields
**WITH** the values from the corresponding set of the previous session
**SO THAT** users can quickly log progressive overload.

**Example**:
- Previous session: Set 1 = 60kg x 10
- New session: Set 1 fields pre-filled with 60kg and 10 reps
- User can modify as needed

---

### R5: Superset Support (LOW)

**EARS Pattern**: *Conditional requirement*

**IF** a user marks two or more exercises as a superset
**THEN** the system SHALL:
1. Group exercises visually
2. Share rest timer between superset exercises
3. Track superset completion as a unit

**SO THAT** superset training is properly supported.

---

### R6: Workout Templates (LOW)

**EARS Pattern**: *State-driven requirement*

**THE SYSTEM** SHALL allow users to:
1. Save current workout as a template
2. Browse saved templates
3. Start a new workout from a template
4. Edit and delete templates

**SO THAT** common routines can be quickly started.

**Template Structure**:
```typescript
interface WorkoutTemplate {
  id: number;
  name: string;
  description?: string;
  exercises: Array<{
    exerciseId: number;
    targetSets: number;
    targetReps: string;
    notes?: string;
  }>;
}
```

---

## Specifications

### S1: File Modifications Summary

| File | Change Type | Priority |
|------|-------------|----------|
| `components/workouts/ActiveWorkout.tsx` | MODIFY - PR UI, auto-population | HIGH |
| `components/workouts/WorkoutSummary.tsx` | CREATE | MEDIUM |
| `components/workouts/ExerciseSearch.tsx` | CREATE | MEDIUM |
| `components/workouts/TemplateManager.tsx` | CREATE | LOW |
| `app/api/v1/workouts/[id]/summary/route.ts` | CREATE | MEDIUM |
| `app/api/v1/workout-templates/route.ts` | CREATE | LOW |
| `lib/actions/fitness-workouts.ts` | MODIFY - Add template actions | LOW |

### S2: API Endpoints Required

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/workouts/[id]/summary` | GET | Get workout summary data |
| `/api/v1/workout-templates` | GET, POST | List and create templates |
| `/api/v1/workout-templates/[id]` | GET, PUT, DELETE | Manage specific template |
| `/api/v1/exercises/search` | GET | Search exercises with filters |

### S3: Component Architecture

```
app/workouts/
├── page.tsx                    # Workouts list page
├── [id]/
│   └── page.tsx               # Active workout page
└── templates/
    └── page.tsx               # Template management page

components/workouts/
├── ActiveWorkout.tsx          # Main workout logger (modify)
├── WorkoutSummary.tsx         # Post-workout summary (create)
├── ExerciseSearch.tsx         # Exercise search modal (create)
├── TemplateManager.tsx        # Template CRUD (create)
├── PRBadge.tsx               # PR indicator badge (create)
└── SupersetGroup.tsx         # Superset visual grouping (create)
```

### S4: State Management

```typescript
// Workout session state (in ActiveWorkout)
interface WorkoutSessionState {
  sessionId: number;
  exercises: Exercise[];
  sets: Record<number, WorkoutSet[]>;
  supersets: number[][]; // Groups of exercise IDs
  personalRecords: PersonalRecord[];
  startTime: Date;
  currentExerciseIndex: number;
}

// Personal record notification
interface PRNotification {
  exerciseId: number;
  exerciseName: string;
  recordType: 'weight' | 'volume' | 'reps';
  previousValue: number;
  newValue: number;
}
```

---

## Traceability

### Related Documentation

- **Database Schema**: `db/migrations/031_add_fitness_tables.sql`
- **Fitness Seeds**: `db/seeds/fitness_exercises.sql`
- **Product Doc**: `.moai/project/product.md` - Fitness Module section

### Dependencies

- `SPEC-SECURITY-001` - Logging should be structured (recommended first)
- Database migrations 031-032 must be applied

### Success Metrics

- 100% of sets logged include weight and reps
- PR detection accuracy: 100%
- Workout completion rate trackable
- Average workout duration visible
- Template usage rate (for future optimization)

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-28 | spec-builder | Initial SPEC creation |
