# SPEC-FITNESS-001: Acceptance Criteria

<!-- TAG:SPEC-FITNESS-001:ACCEPTANCE -->

---

## Overview

This document defines the acceptance criteria for completing the Fitness Module. All criteria must pass before the SPEC can be marked as complete.

---

## Phase 1: Personal Record System

### AC1.1: PR Toast Notification

**Given** a user is in an active workout session
**And** they complete a set with weight/reps exceeding their previous best
**When** the set is saved
**Then** a toast notification SHALL appear with the PR details

**Verification Method**:
1. Start a workout with an exercise that has previous history
2. Log a set with higher weight than previous best
3. Verify toast notification appears

**Pass Criteria**:
- [ ] Toast notification appears within 1 second of set completion
- [ ] Toast includes exercise name
- [ ] Toast includes PR type (weight/volume/reps)
- [ ] Toast includes new value and improvement amount

---

### AC1.2: PR Badge Display

**Given** a set has been completed that is a personal record
**When** the completed sets list is displayed
**Then** a PR badge SHALL be visible on that set

**Verification Method**:
```typescript
// Check that PR sets have badge
const completedSet = screen.getByTestId(`set-${setNumber}`);
expect(completedSet).toContainElement(screen.getByText(/PR/));
```

**Pass Criteria**:
- [ ] PR badge visible on record-breaking set
- [ ] Badge indicates PR type (Weight/Volume/Reps)
- [ ] Non-PR sets do not show badge

---

### AC1.3: PR Database Recording

**Given** a personal record is achieved
**When** the set is logged
**Then** the PR SHALL be recorded in the fitness_personal_records table

**Verification Method**:
```sql
SELECT * FROM fitness_personal_records
WHERE exercise_id = [exercise_id]
AND achieved_at >= NOW() - INTERVAL '1 minute';
```

**Pass Criteria**:
- [ ] New row created in fitness_personal_records
- [ ] record_type matches the PR type
- [ ] value matches the achieved value
- [ ] achieved_at timestamp is accurate

---

## Phase 2: Set Auto-Population

### AC2.1: First Set Auto-Fill

**Given** an exercise has previous session data
**When** the user starts logging the first set
**Then** weight and reps fields SHALL be pre-filled with previous Set 1 values

**Verification Method**:
1. Complete a workout with specific values (e.g., 60kg x 10)
2. Start new workout with same exercise
3. Check that Set 1 shows 60kg and 10 in input fields

**Pass Criteria**:
- [ ] Weight field shows previous Set 1 weight
- [ ] Reps field shows previous Set 1 reps
- [ ] Fields are editable
- [ ] Submit works with pre-filled values

---

### AC2.2: Subsequent Set Auto-Fill

**Given** Set 1 has been completed in current session
**When** preparing to log Set 2
**Then** weight and reps SHALL be pre-filled with previous Set 2 values

**Verification Method**:
1. Previous session: Set 1 = 60kg x 10, Set 2 = 65kg x 8
2. Complete Set 1 in new session
3. Verify fields show 65kg and 8

**Pass Criteria**:
- [ ] Each set auto-fills from corresponding previous set
- [ ] If no previous set exists, uses last completed set values
- [ ] Auto-fill happens after set completion

---

### AC2.3: First-Time Exercise Handling

**Given** an exercise has no previous session data
**When** the user starts logging
**Then** default values SHALL be shown (0kg, 10 reps)

**Pass Criteria**:
- [ ] Weight defaults to 0 for new exercises
- [ ] Reps defaults to 10 for new exercises
- [ ] No errors when no previous data exists

---

## Phase 3: Ad-Hoc Exercise Addition

### AC3.1: Add Exercise Button Visibility

**Given** a user is in an active workout session
**When** viewing the exercise tabs
**Then** an "Add Exercise" button SHALL be visible

**Pass Criteria**:
- [ ] Plus button visible in exercise tab area
- [ ] Button is accessible (not hidden on scroll)
- [ ] Button has appropriate touch target size (44x44px minimum)

---

### AC3.2: Exercise Search Functionality

**Given** the exercise search modal is open
**When** the user types a search query
**Then** matching exercises SHALL be displayed

**Test Scenarios**:
| Search Query | Expected Results |
|--------------|------------------|
| "bench" | Bench Press, Incline Bench, Decline Bench |
| "squat" | Squat, Front Squat, Goblet Squat |
| "" (empty) | All exercises (limited) |

**Pass Criteria**:
- [ ] Search returns relevant results within 500ms
- [ ] Results include exercise name, category, muscle
- [ ] Empty search shows popular/recent exercises

---

### AC3.3: Exercise Filter Functionality

**Given** the exercise search modal is open
**When** the user applies filters (category, muscle group)
**Then** results SHALL be filtered accordingly

**Pass Criteria**:
- [ ] Category filter works (Strength, Cardio, Flexibility)
- [ ] Muscle filter works (Chest, Back, Legs, etc.)
- [ ] Filters can be combined
- [ ] Clear filter button available

---

### AC3.4: Exercise Addition to Workout

**Given** a user selects an exercise from search
**When** they confirm selection
**Then** the exercise SHALL be added to the current workout

**Pass Criteria**:
- [ ] Exercise appears as new tab
- [ ] Can navigate to new exercise
- [ ] Can log sets for new exercise
- [ ] Sets persist to database

---

## Phase 4: Workout Summary

### AC4.1: Summary Display on Completion

**Given** a user has completed at least one set
**When** they click "End Workout"
**Then** a workout summary dialog SHALL be displayed

**Pass Criteria**:
- [ ] Summary dialog appears
- [ ] Dialog is modal (blocks background)
- [ ] Can dismiss summary to return to workouts list

---

### AC4.2: Summary Statistics Accuracy

**Given** a completed workout with known values
**When** the summary is displayed
**Then** all statistics SHALL be calculated correctly

**Test Data**:
```
Exercise 1: 3 sets - 60kg x 10, 65kg x 8, 70kg x 6
Exercise 2: 2 sets - 20kg x 15, 25kg x 12
```

**Expected Results**:
- Duration: Accurate to workout duration
- Exercises: 2
- Sets: 5
- Total Reps: 10 + 8 + 6 + 15 + 12 = 51
- Total Volume: (60*10) + (65*8) + (70*6) + (20*15) + (25*12) = 600 + 520 + 420 + 300 + 300 = 2140kg

**Pass Criteria**:
- [ ] Exercise count correct
- [ ] Set count correct
- [ ] Rep count correct
- [ ] Volume calculation correct
- [ ] Duration matches session time

---

### AC4.3: PR Display in Summary

**Given** personal records were achieved during the workout
**When** the summary is displayed
**Then** all PRs SHALL be listed

**Pass Criteria**:
- [ ] PR section visible if PRs achieved
- [ ] Each PR shows exercise name
- [ ] Each PR shows record type and value
- [ ] No PR section if none achieved

---

## Phase 5: Workout Templates (Optional)

### AC5.1: Save Workout as Template

**Given** a completed or in-progress workout
**When** the user saves as template
**Then** the template SHALL be stored with exercise selection

**Pass Criteria**:
- [ ] Save template option available
- [ ] Can name the template
- [ ] Template saved to database
- [ ] Template includes all exercises and target sets/reps

---

### AC5.2: Start Workout from Template

**Given** saved workout templates exist
**When** the user starts workout from template
**Then** exercises SHALL be pre-loaded

**Pass Criteria**:
- [ ] Template list shows saved templates
- [ ] Selecting template creates new workout session
- [ ] All template exercises loaded
- [ ] Target sets/reps visible as reference

---

## Quality Gate

### Definition of Done

All of the following must be true:

1. **PR System**
   - [ ] Toast notifications working
   - [ ] PR badges displaying
   - [ ] PRs recorded in database
   - [ ] Multiple PR types detected

2. **Auto-Population**
   - [ ] Previous set values pre-filled
   - [ ] Works for all set numbers
   - [ ] Handles new exercises gracefully

3. **Exercise Addition**
   - [ ] Search modal functional
   - [ ] Filters working
   - [ ] Exercises addable mid-workout
   - [ ] Added exercises persist

4. **Summary**
   - [ ] Shows on workout completion
   - [ ] All stats accurate
   - [ ] PRs displayed
   - [ ] Can dismiss and return to main view

5. **Code Quality**
   - [ ] No TypeScript errors
   - [ ] No console.log statements
   - [ ] Mobile responsive
   - [ ] Accessible (keyboard navigable)

---

## Test Scenarios Summary

| Scenario | Type | Priority |
|----------|------|----------|
| Log set exceeding previous best | Integration | HIGH |
| Auto-fill from previous session | Integration | HIGH |
| Add exercise during workout | Integration | MEDIUM |
| Complete workout and view summary | Integration | MEDIUM |
| Save and load workout template | Integration | LOW |

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-28 | spec-builder | Initial acceptance criteria |
