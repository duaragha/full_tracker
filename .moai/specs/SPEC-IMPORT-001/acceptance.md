# SPEC-IMPORT-001: Acceptance Criteria

## Test Scenarios

### Scenario 1: Basic Liftoscript Import

**GIVEN** the user enters the following Liftoscript text:
```
Squat / 3x6 / 125kg / progress: lp(5kg)
Bench Press / 3x8-12 / 80kg / progress: dp(2.5kg, 8, 12)
Deadlift / 1x5 / 140kg
```

**WHEN** the user clicks "Import"

**THEN**:
- [ ] 3 exercises are created or matched to existing
- [ ] 1 workout template named "Imported Program" is created
- [ ] Template contains 3 exercises in order
- [ ] Squat has: 3 sets, 6 reps, 125kg, LP progression (+5kg)
- [ ] Bench Press has: 3 sets, 8-12 rep range, 80kg, DP progression
- [ ] Deadlift has: 1 set, 5 reps, 140kg, no progression
- [ ] Import is tracked in `fitness_imports` table
- [ ] Success message shows "Imported 3 exercises, 1 program"

---

### Scenario 2: Liftosaur JSON Program Import

**GIVEN** a Liftosaur JSON export file containing:
- 5 custom exercises
- 1 program with 4 weeks
- 3 training days per week

**WHEN** the user uploads and confirms the import

**THEN**:
- [ ] 5 exercises are created with Liftosaur metadata
- [ ] 1 workout template folder is created
- [ ] 4 weekly templates are created
- [ ] Each week contains 3 day templates
- [ ] Exercise text is parsed for each day
- [ ] Progression rules are stored
- [ ] Success message shows complete stats

---

### Scenario 3: Hevy CSV History Import

**GIVEN** a Hevy CSV file with 50 workouts over 3 months:
```csv
"title","start_time","end_time","exercise_title","set_index","weight_lbs","reps","rpe"
"Push Day","2024-01-15 10:00","2024-01-15 11:30","Bench Press",0,135,8,7
"Push Day","2024-01-15 10:00","2024-01-15 11:30","Bench Press",1,145,6,8
...
```

**WHEN** the user uploads and confirms the import

**THEN**:
- [ ] All unique exercises are created/matched
- [ ] 50 workout sessions are created with correct dates
- [ ] All sets are imported with converted weights (lbs → kg)
- [ ] RPE values are preserved
- [ ] Personal records are detected and marked
- [ ] Workout durations are calculated
- [ ] Success message shows: "Imported X workouts, Y sets, Z personal records"

---

### Scenario 4: Exercise Matching

**GIVEN** an import contains exercise "Barbell Bench Press"
**AND** existing exercise "Bench Press (Barbell)" exists in database

**WHEN** the preview is shown

**THEN**:
- [ ] System suggests "Bench Press (Barbell)" as a match
- [ ] Match confidence score is displayed
- [ ] User can accept match or create new exercise
- [ ] User's choice is remembered for future imports

---

### Scenario 5: Unit Conversion

**GIVEN** user's weight preference is set to "kg"
**AND** Hevy CSV contains weight "135" in `weight_lbs` column

**WHEN** the import is processed

**THEN**:
- [ ] Weight is converted to 61.24 kg (135 * 0.453592)
- [ ] Stored value is in kilograms
- [ ] Display shows "61.2 kg"

---

### Scenario 6: Import Error Handling

**GIVEN** a Hevy CSV with errors:
- Row 15: Missing reps value
- Row 22: Negative weight
- Row 45: Invalid date format

**WHEN** the import is attempted

**THEN**:
- [ ] Error report shows 3 errors with row numbers
- [ ] Error messages are descriptive
- [ ] User can choose to skip errors and import valid rows
- [ ] Valid rows (47/50) are imported successfully
- [ ] Skipped rows are logged

---

### Scenario 7: Import Rollback

**GIVEN** a completed import of 30 workouts
**AND** user realizes wrong file was imported

**WHEN** user clicks "Rollback" on the import

**THEN**:
- [ ] All 30 imported workouts are deleted
- [ ] Related sets are deleted
- [ ] Related personal records are deleted
- [ ] Exercises created only for this import are deleted
- [ ] Import record is marked as rolled back
- [ ] Success message confirms rollback

---

### Scenario 8: Duplicate Detection

**GIVEN** an import of workout history
**AND** workout from "2024-01-15" already exists

**WHEN** the preview is shown

**THEN**:
- [ ] Duplicate is highlighted
- [ ] User can choose: Skip / Merge / Replace
- [ ] Skip: Existing workout unchanged
- [ ] Merge: Add new sets to existing workout
- [ ] Replace: Delete existing, import new

---

### Scenario 9: Liftoscript Custom Progression

**GIVEN** Liftoscript with custom progression:
```
Squat / 3x6 / 100kg / progress: custom(failures: 0) {~
  if (completedReps >= reps) {
    weights += 5kg
    state.failures = 0
  } else {
    state.failures = state.failures + 1
  }
  if (state.failures >= 3) {
    weights = weights * 0.9
    state.failures = 0
  }
~}
```

**WHEN** the import is processed

**THEN**:
- [ ] Exercise is created with template
- [ ] Custom progression rule is stored
- [ ] State variable `failures` is initialized to 0
- [ ] Liftoscript code is preserved for execution

---

### Scenario 10: Large File Performance

**GIVEN** a Hevy CSV file with 10,000 sets (~1MB)

**WHEN** the import is initiated

**THEN**:
- [ ] Progress indicator shows percentage
- [ ] Import completes in < 10 seconds
- [ ] No timeout errors
- [ ] UI remains responsive
- [ ] Memory usage stays reasonable

---

## Edge Cases

### EC-1: Empty File
**GIVEN** empty file upload
**THEN** show error "File is empty"

### EC-2: Wrong File Type
**GIVEN** user uploads PDF instead of CSV
**THEN** show error "Invalid file type. Expected CSV."

### EC-3: Malformed JSON
**GIVEN** corrupted Liftosaur JSON
**THEN** show JSON parse error with location

### EC-4: Unknown Exercise Format
**GIVEN** Liftoscript with unrecognized syntax
**THEN** show parsing error with line number and suggestion

### EC-5: Missing Required Columns
**GIVEN** CSV missing `exercise_title` column
**THEN** show error listing missing required columns

### EC-6: Extremely Long Exercise Name
**GIVEN** exercise name > 200 characters
**THEN** truncate to 200 with warning

### EC-7: Zero/Negative Values
**GIVEN** weight = 0 or reps = -1
**THEN** skip row with warning, don't fail entire import

### EC-8: Future Dates
**GIVEN** workout date in future
**THEN** show warning but allow import

---

## Quality Gates

| Metric | Target |
|--------|--------|
| Test Coverage | > 85% |
| Import Success Rate | > 95% for valid files |
| Average Import Time | < 2s for standard files |
| Error Message Clarity | User-understandable |
| Data Integrity | 100% accurate conversion |
