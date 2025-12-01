---
id: SPEC-IMPORT-001
version: 1.0.0
status: draft
created: 2025-12-01
updated: 2025-12-01
author: MoAI-ADK
priority: high
---

# SPEC-IMPORT-001: Workout Data Import System

## HISTORY

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12-01 | MoAI-ADK | Initial SPEC creation |

---

## Overview

Implement a comprehensive workout data import system supporting multiple formats:
- **Liftoscript Text** - Liftosaur's text-based exercise definition syntax
- **Liftosaur JSON** - Full program export format from Liftosaur app
- **Hevy CSV** - Workout history export from Hevy app

The system will import exercises, workout programs, workout history, and personal records with full support for Liftoscript progression logic.

---

## Functional Requirements (MUST)

### FR-1: Liftoscript Parser
The system **MUST** parse Liftoscript syntax to extract exercise definitions.

**Syntax Support:**
```
Exercise Name / SetsxReps / Weight / warmup: type / progress: method
```

**Examples:**
- `Squat / 3x6 / 125kg / warmup: none / progress: lp(5kg)`
- `Bench Press / 3x8-12 / 80kg / progress: dp(2.5kg, 8, 12)`
- `Deadlift / 1x5 / 140kg / progress: lp(5kg)`

### FR-2: Liftoscript Progression Functions
The system **MUST** support built-in progression functions:

| Function | Syntax | Description |
|----------|--------|-------------|
| `lp()` | `lp(weight_increase)` | Linear Progression - add weight after success |
| `dp()` | `dp(weight, min_reps, max_reps)` | Double Progression - increase reps then weight |
| `sum()` | `sum(threshold, weight)` | Reps Sum - add weight when total exceeds threshold |

### FR-3: Liftoscript State Variables
The system **MUST** support state variables for complex progression:
- Read-only: `weights[n]`, `reps[n]`, `completedReps[n]`, `rm1`, `numberOfSets`
- Read-write: `state.*` custom variables

### FR-4: Liftosaur JSON Import
The system **MUST** parse Liftosaur's JSON export format:
```json
{
  "exportedProgram": {
    "customExercises": { ... },
    "program": {
      "planner": {
        "name": "Program Name",
        "weeks": [{ "days": [{ "exerciseText": "..." }] }]
      }
    }
  }
}
```

### FR-5: Hevy CSV Import
The system **MUST** parse Hevy's CSV export format:

| Column | Type | Description |
|--------|------|-------------|
| `title` | TEXT | Workout name |
| `start_time` | DATETIME | Workout start time |
| `end_time` | DATETIME | Workout end time |
| `exercise_title` | TEXT | Exercise name |
| `set_index` | INTEGER | Set number |
| `set_type` | TEXT | Type of set |
| `weight_lbs` | REAL | Weight in pounds |
| `reps` | INTEGER | Number of reps |
| `rpe` | INTEGER | Rate of Perceived Exertion |

### FR-6: Exercise Library Import
The system **MUST** import exercises with:
- Name and description
- Target muscle groups
- Equipment requirements
- Custom exercise flag

### FR-7: Workout Program Import
The system **MUST** import workout programs with:
- Program name and description
- Weekly structure
- Day-by-day exercise assignments
- Set/rep schemes
- Progression rules

### FR-8: Workout History Import
The system **MUST** import historical workout data with:
- Date and duration
- Exercises performed
- Sets with reps, weight, and RPE
- Personal record detection

### FR-9: Personal Records Import
The system **MUST** detect and import personal records:
- 1RM estimates (Epley formula)
- Weight for reps records
- Volume records

### FR-10: Unit Conversion
The system **MUST** convert between:
- Pounds (lbs) ↔ Kilograms (kg)
- Miles ↔ Meters
- User preference for display units

---

## Non-Functional Requirements (SHOULD)

### NFR-1: Performance
The system **SHOULD** process imports within:
- < 2 seconds for files under 1MB
- < 10 seconds for files up to 10MB
- Progress indicator for large imports

### NFR-2: Data Validation
The system **SHOULD** validate imported data:
- Exercise name matching with fuzzy search
- Duplicate detection
- Data type validation
- Range validation (reasonable weight/rep values)

### NFR-3: Error Handling
The system **SHOULD** provide meaningful error messages:
- Line-by-line error reporting for CSV
- JSON path indication for JSON errors
- Syntax error highlighting for Liftoscript

### NFR-4: Conflict Resolution
The system **SHOULD** handle conflicts:
- Existing exercise matching
- Duplicate workout detection
- User choice for merge/replace/skip

### NFR-5: Undo/Rollback
The system **SHOULD** support:
- Preview before import
- Batch rollback of imported data
- Import history tracking

---

## Interface Requirements (SHALL)

### IR-1: Import API Endpoints
The system **SHALL** provide REST API endpoints:

```typescript
// Import endpoints
POST /api/v1/import/liftoscript
POST /api/v1/import/liftosaur-json
POST /api/v1/import/hevy-csv

// Common response
interface ImportResult {
  success: boolean;
  imported: {
    exercises: number;
    programs: number;
    workouts: number;
    sets: number;
    personalRecords: number;
  };
  errors: ImportError[];
  warnings: ImportWarning[];
}
```

### IR-2: File Upload Interface
The system **SHALL** provide file upload UI:
- Drag-and-drop support
- File type validation
- Progress indicator
- Preview before confirmation

### IR-3: Text Input Interface
The system **SHALL** provide text input for Liftoscript:
- Multi-line text area
- Syntax highlighting (optional)
- Real-time validation
- Example templates

---

## Design Constraints (MUST)

### DC-1: Database Schema
The system **MUST** use existing fitness schema tables:
- `fitness_exercises`
- `fitness_workout_templates`
- `fitness_template_exercises`
- `fitness_workouts`
- `fitness_workout_exercises`
- `fitness_sets`
- `fitness_personal_records`

### DC-2: New Tables Required
The system **MUST** add new tables for:

```sql
-- Import tracking
CREATE TABLE fitness_imports (
  id SERIAL PRIMARY KEY,
  import_type TEXT NOT NULL, -- 'liftoscript', 'liftosaur_json', 'hevy_csv'
  source_filename TEXT,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  stats JSONB, -- { exercises: n, workouts: n, ... }
  is_rolled_back BOOLEAN DEFAULT FALSE
);

-- Progression rules (Liftoscript)
CREATE TABLE fitness_progression_rules (
  id SERIAL PRIMARY KEY,
  template_exercise_id INTEGER REFERENCES fitness_template_exercises(id),
  rule_type TEXT NOT NULL, -- 'lp', 'dp', 'sum', 'custom'
  rule_config JSONB NOT NULL, -- Function parameters
  liftoscript_code TEXT, -- Raw Liftoscript for custom
  state_variables JSONB DEFAULT '{}'
);

-- Exercise aliases for matching
CREATE TABLE fitness_exercise_aliases (
  id SERIAL PRIMARY KEY,
  exercise_id INTEGER REFERENCES fitness_exercises(id),
  alias TEXT NOT NULL,
  source TEXT -- 'liftosaur', 'hevy', 'strong', 'manual'
);
```

### DC-3: Technology Stack
The system **MUST** use:
- TypeScript for parser implementation
- Next.js server actions for API
- PostgreSQL for data storage
- Zod for validation schemas

### DC-4: Liftoscript Parser Architecture
The system **MUST** implement parser with:
- Tokenizer for Liftoscript syntax
- AST (Abstract Syntax Tree) generation
- Expression evaluator for progression logic
- State management for variables

---

## Acceptance Criteria

### AC-1: Liftoscript Parsing
**GIVEN** a Liftoscript text input:
```
Squat / 3x6 / 125kg / progress: lp(5kg)
Bench Press / 3x8-12 / 80kg / progress: dp(2.5kg, 8, 12)
```
**WHEN** the user imports the text
**THEN** the system creates:
- 2 exercises in the library (if not existing)
- 1 workout template with 2 exercises
- Progression rules for each exercise

### AC-2: Liftosaur JSON Import
**GIVEN** a valid Liftosaur JSON export file
**WHEN** the user uploads and confirms import
**THEN** the system imports:
- All custom exercises
- Complete program structure
- Set/rep configurations
- Progression rules

### AC-3: Hevy CSV Import
**GIVEN** a Hevy CSV export file with workout history
**WHEN** the user uploads and confirms import
**THEN** the system imports:
- All unique exercises
- Historical workouts with dates
- Individual sets with weight/reps
- Detected personal records

### AC-4: Exercise Matching
**GIVEN** an import with exercise name "Barbell Squat"
**WHEN** an existing exercise "Squat (Barbell)" exists
**THEN** the system suggests matching and allows user to confirm

### AC-5: Unit Conversion
**GIVEN** weight data in pounds (e.g., 135 lbs)
**WHEN** user's preference is kilograms
**THEN** the system converts and stores as 61.24 kg

### AC-6: Error Handling
**GIVEN** a CSV file with invalid data on row 15
**WHEN** import is attempted
**THEN** the system shows error for row 15 and continues processing valid rows

---

## Technical Implementation Notes

### Liftoscript Grammar (Simplified)
```
exercise_line := exercise_name "/" sets_reps "/" weight [warmup_clause] [progress_clause]
sets_reps := number "x" rep_range
rep_range := number | number "-" number
weight := number unit
unit := "kg" | "lb"
warmup_clause := "/ warmup:" warmup_type
progress_clause := "/ progress:" progress_fn
progress_fn := "lp(" weight ")" | "dp(" weight "," number "," number ")" | "sum(" number "," weight ")" | "custom(" state_def ") {~" script "~}"
```

### Data Flow
```
Input File/Text
     ↓
Format Detection
     ↓
Parser (format-specific)
     ↓
Normalized Data Structure
     ↓
Validation & Matching
     ↓
User Preview & Confirmation
     ↓
Database Insert (Transaction)
     ↓
Import Tracking
```

### Sources

- [Liftosaur GitHub Repository](https://github.com/astashov/liftosaur)
- [Liftosaur Documentation](https://www.liftosaur.com/blog/docs/)
- [Hevy CSV Format](https://blog.ayjc.net/posts/migrate-strong-hevy-app/)
