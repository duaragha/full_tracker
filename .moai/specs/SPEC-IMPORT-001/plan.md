# SPEC-IMPORT-001: Implementation Plan

## Phase 1: Database Schema (Day 1)

### Task 1.1: Create Import Tracking Tables
```sql
-- New migration: 034_add_import_tables.sql
CREATE TABLE fitness_imports (...)
CREATE TABLE fitness_progression_rules (...)
CREATE TABLE fitness_exercise_aliases (...)
```

### Task 1.2: Add Progression Fields to Existing Tables
- Add `progression_rule_id` to `fitness_template_exercises`
- Add `imported_from` to `fitness_exercises`
- Add `import_id` to `fitness_workouts`

---

## Phase 2: Liftoscript Parser (Days 2-3)

### Task 2.1: Tokenizer
File: `lib/parsers/liftoscript/tokenizer.ts`
- Number tokens (integers, decimals)
- Weight tokens (with units)
- Operator tokens
- Keyword tokens (progress, warmup, etc.)
- Identifier tokens

### Task 2.2: AST Types
File: `lib/parsers/liftoscript/types.ts`
```typescript
interface ExerciseLine {
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  weight: Weight;
  warmup?: WarmupConfig;
  progress?: ProgressConfig;
}

interface ProgressConfig {
  type: 'lp' | 'dp' | 'sum' | 'custom';
  params: Record<string, number | string>;
  script?: string;
}
```

### Task 2.3: Parser Implementation
File: `lib/parsers/liftoscript/parser.ts`
- Parse exercise lines
- Parse progress functions
- Parse state variables
- Error handling with line numbers

### Task 2.4: Progression Evaluator
File: `lib/parsers/liftoscript/evaluator.ts`
- Execute lp(), dp(), sum() functions
- Handle state variables
- Support custom scripts

---

## Phase 3: Format-Specific Importers (Days 4-5)

### Task 3.1: Liftoscript Importer
File: `lib/importers/liftoscript-importer.ts`
- Parse multi-line Liftoscript text
- Create exercises if not existing
- Create workout template
- Store progression rules

### Task 3.2: Liftosaur JSON Importer
File: `lib/importers/liftosaur-importer.ts`
- Parse JSON structure
- Extract custom exercises
- Extract program weeks/days
- Parse exercise text for each day
- Map to database schema

### Task 3.3: Hevy CSV Importer
File: `lib/importers/hevy-importer.ts`
- Parse CSV with proper headers
- Group by workout (title + start_time)
- Convert lbs to kg
- Detect personal records
- Create workout history

---

## Phase 4: Exercise Matching (Day 6)

### Task 4.1: Fuzzy Matching Algorithm
File: `lib/importers/exercise-matcher.ts`
- Levenshtein distance for name similarity
- Alias lookup
- Common variations handling
  - "Barbell Squat" = "Squat (Barbell)" = "Back Squat"
- Confidence scoring

### Task 4.2: Alias Database
- Seed common exercise aliases
- User-contributed aliases
- Auto-learn from user matches

---

## Phase 5: API Endpoints (Day 7)

### Task 5.1: Import API Routes
```
app/api/v1/import/liftoscript/route.ts
app/api/v1/import/liftosaur-json/route.ts
app/api/v1/import/hevy-csv/route.ts
```

### Task 5.2: Server Actions
File: `lib/actions/import-actions.ts`
- `importLiftoscript(text: string)`
- `importLiftosaurJSON(data: object)`
- `importHevyCSV(csvContent: string)`
- `rollbackImport(importId: number)`
- `getImportHistory()`

### Task 5.3: Validation Schemas
File: `lib/validators/import-schemas.ts`
- Zod schemas for each format
- Error message formatting

---

## Phase 6: UI Components (Days 8-9)

### Task 6.1: Import Page
File: `app/workouts/import/page.tsx`
- Tab navigation for different formats
- Instructions for each format
- Example data

### Task 6.2: File Upload Component
File: `components/workouts/ImportFileUpload.tsx`
- Drag and drop zone
- File type validation
- Progress indicator

### Task 6.3: Liftoscript Editor
File: `components/workouts/LiftoscriptEditor.tsx`
- Multi-line text area
- Template examples
- Real-time parsing feedback

### Task 6.4: Preview Component
File: `components/workouts/ImportPreview.tsx`
- Parsed data display
- Exercise matching UI
- Conflict resolution
- Confirm/Cancel buttons

### Task 6.5: Import History
File: `components/workouts/ImportHistory.tsx`
- List of past imports
- Rollback option
- Stats display

---

## Phase 7: Testing (Day 10)

### Task 7.1: Parser Unit Tests
```
__tests__/parsers/liftoscript.test.ts
```
- Tokenizer tests
- Parser tests
- Edge cases

### Task 7.2: Importer Tests
```
__tests__/importers/liftoscript-importer.test.ts
__tests__/importers/liftosaur-importer.test.ts
__tests__/importers/hevy-importer.test.ts
```

### Task 7.3: Integration Tests
- Full import flow
- Database verification
- Rollback testing

### Task 7.4: E2E Tests
- File upload
- Preview confirmation
- Data verification

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `papaparse` | ^5.4.1 | CSV parsing |
| `zod` | ^3.22.4 | Schema validation |
| `fuse.js` | ^7.0.0 | Fuzzy search for exercise matching |

---

## Risk Mitigation

1. **Large File Handling**: Implement streaming for CSV files > 5MB
2. **Transaction Safety**: Use database transactions for atomic imports
3. **Data Integrity**: Validate all data before insert
4. **User Experience**: Show progress for long imports
5. **Rollback Safety**: Track all inserted records for clean rollback

---

## Timeline Summary

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| 1. Database Schema | 1 day | New tables, migrations |
| 2. Liftoscript Parser | 2 days | Complete parser with evaluator |
| 3. Format Importers | 2 days | 3 format-specific importers |
| 4. Exercise Matching | 1 day | Fuzzy matching system |
| 5. API Endpoints | 1 day | REST API + Server Actions |
| 6. UI Components | 2 days | Import page + components |
| 7. Testing | 1 day | Unit + Integration + E2E |

**Total: 10 days**
