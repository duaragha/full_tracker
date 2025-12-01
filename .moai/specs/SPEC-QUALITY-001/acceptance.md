# SPEC-QUALITY-001: Acceptance Criteria

<!-- TAG:SPEC-QUALITY-001:ACCEPTANCE -->

---

## Overview

This document defines the acceptance criteria for the Code Quality Refactoring SPEC. All criteria must pass before the SPEC can be marked as complete.

---

## Phase 1: Large File Decomposition

### AC1.1: Books Page Line Count

**Given** the books page has been refactored
**When** counting lines in app/books/page.tsx
**Then** the file SHALL contain fewer than 150 lines

**Verification Method**:
```bash
wc -l app/books/page.tsx
# Expected: < 150
```

**Pass Criteria**:
- [ ] app/books/page.tsx < 150 lines
- [ ] app/books/books-client.tsx < 250 lines
- [ ] All component files < 200 lines

---

### AC1.2: Movies Page Line Count

**Given** the movies page has been refactored
**When** counting lines in app/movies/page.tsx
**Then** the file SHALL contain fewer than 150 lines

**Verification Method**:
```bash
wc -l app/movies/page.tsx
# Expected: < 150
```

**Pass Criteria**:
- [ ] app/movies/page.tsx < 150 lines
- [ ] app/movies/movies-client.tsx < 250 lines
- [ ] All component files < 200 lines

---

### AC1.3: Component Directory Structure

**Given** the refactoring is complete
**When** examining the directory structure
**Then** the following structure SHALL exist:

```
app/books/
├── page.tsx
├── books-client.tsx
└── components/
    ├── book-list.tsx
    ├── book-filters.tsx
    ├── book-stats.tsx
    └── book-dialogs.tsx

app/movies/
├── page.tsx
├── movies-client.tsx
└── components/
    ├── movie-list.tsx
    ├── movie-filters.tsx
    ├── movie-stats.tsx
    └── movie-dialogs.tsx
```

**Pass Criteria**:
- [ ] Books components directory exists
- [ ] Movies components directory exists
- [ ] All listed files present

---

### AC1.4: No Functionality Regression

**Given** the refactored pages
**When** performing all CRUD operations
**Then** all operations SHALL work identically to before

**Test Scenarios**:

| Operation | Books | Movies |
|-----------|-------|--------|
| View list | Works | Works |
| Add entry | Works | Works |
| Edit entry | Works | Works |
| Delete entry | Works | Works |
| Filter by status | Works | Works |
| Search | Works | Works |
| View stats | Works | Works |

**Pass Criteria**:
- [ ] All book CRUD operations functional
- [ ] All movie CRUD operations functional
- [ ] Filters working correctly
- [ ] Search working correctly
- [ ] Statistics displaying accurately

---

## Phase 2: Unified Entry Form

### AC2.1: Entry Form Component Exists

**Given** the unified entry form has been created
**When** examining components/ui/entry-form/
**Then** the directory SHALL contain all required files

**Pass Criteria**:
- [ ] entry-form.tsx exists
- [ ] config.ts exists
- [ ] media-search.tsx exists
- [ ] status-select.tsx exists
- [ ] rating-input.tsx exists

---

### AC2.2: Form Used in Books Page

**Given** the books add/edit dialog
**When** opening the dialog
**Then** it SHALL use the unified EntryForm component

**Verification Method**:
```typescript
// In book-dialogs.tsx
import { EntryForm } from '@/components/ui/entry-form';

// Usage
<EntryForm
  type="book"
  mode="add"
  onSubmit={handleSubmit}
  onCancel={handleCancel}
/>
```

**Pass Criteria**:
- [ ] Books add dialog uses EntryForm
- [ ] Books edit dialog uses EntryForm
- [ ] All book-specific fields render correctly

---

### AC2.3: Form Used in Movies Page

**Given** the movies add/edit dialog
**When** opening the dialog
**Then** it SHALL use the unified EntryForm component

**Pass Criteria**:
- [ ] Movies add dialog uses EntryForm
- [ ] Movies edit dialog uses EntryForm
- [ ] All movie-specific fields render correctly

---

### AC2.4: Form Validation

**Given** the unified entry form
**When** submitting with invalid data
**Then** appropriate validation errors SHALL be displayed

**Test Scenarios**:
| Field | Invalid Value | Expected Error |
|-------|---------------|----------------|
| Title | Empty | "Title is required" |
| Rating | 11 | "Rating must be between 0 and 10" |
| Status | Empty | "Status is required" |

**Pass Criteria**:
- [ ] Empty title shows error
- [ ] Invalid rating shows error
- [ ] Missing status shows error
- [ ] Form does not submit with errors

---

## Phase 3: Error Boundaries

### AC3.1: Error Boundary Component Exists

**Given** the error boundary implementation
**When** examining components/error-boundary.tsx
**Then** the component SHALL exist and export ErrorBoundary

**Pass Criteria**:
- [ ] File exists at components/error-boundary.tsx
- [ ] Exports ErrorBoundary class component
- [ ] Has fallback UI rendering
- [ ] Has retry functionality

---

### AC3.2: Books Page Error Handling

**Given** an error occurs in the books list component
**When** the error is thrown
**Then** the error boundary SHALL catch it and display fallback UI

**Test Method**:
```typescript
// Temporarily add to BookList:
if (process.env.TEST_ERROR) throw new Error('Test error');
```

**Pass Criteria**:
- [ ] Error caught by boundary
- [ ] Fallback UI displayed
- [ ] Rest of page still functional
- [ ] Retry button works

---

### AC3.3: Movies Page Error Handling

**Given** an error occurs in the movies list component
**When** the error is thrown
**Then** the error boundary SHALL catch it and display fallback UI

**Pass Criteria**:
- [ ] Error caught by boundary
- [ ] Fallback UI displayed
- [ ] Rest of page still functional
- [ ] Retry button works

---

### AC3.4: Error Logging

**Given** an error is caught by the boundary
**When** the error occurs
**Then** the error SHALL be logged appropriately

**Pass Criteria**:
- [ ] Error logged with structured logger (from SPEC-SECURITY-001)
- [ ] Component stack trace included
- [ ] Error message captured

---

## Phase 4: Action Consolidation

### AC4.1: Unified Books Action

**Given** the consolidated books action
**When** calling getBooks with various options
**Then** all pagination and filtering SHALL work

**Test Scenarios**:
```typescript
// No options - get all
await getBooks();

// With pagination
await getBooks({ page: 2, limit: 20 });

// With filters
await getBooks({ status: 'reading', search: 'fantasy' });

// Combined
await getBooks({ page: 1, limit: 10, status: 'finished', search: 'tolkien' });
```

**Pass Criteria**:
- [ ] getBooks() returns all books
- [ ] Pagination works correctly
- [ ] Status filter works
- [ ] Search filter works
- [ ] Sorting works
- [ ] Total count accurate

---

### AC4.2: No Duplicate Action Files

**Given** the action consolidation is complete
**When** examining lib/actions/
**Then** there SHALL be no duplicate paginated versions

**Verification Method**:
```bash
ls lib/actions/ | grep -i paginated
# Expected: No results
```

**Pass Criteria**:
- [ ] No *-paginated.ts files exist
- [ ] Single books.ts file handles all cases
- [ ] Single movies.ts file handles all cases

---

## Phase 5: Sentry Integration (Optional)

### AC5.1: Sentry Configured

**Given** Sentry is to be integrated
**When** an error occurs in production
**Then** the error SHALL be reported to Sentry

**Pass Criteria**:
- [ ] Sentry DSN configured
- [ ] Client config file exists
- [ ] Server config file exists
- [ ] Error boundary reports to Sentry

---

### AC5.2: Error Context Included

**Given** an error is reported to Sentry
**When** viewing the error in Sentry dashboard
**Then** relevant context SHALL be included

**Pass Criteria**:
- [ ] Component name included
- [ ] Stack trace readable
- [ ] Environment tag correct
- [ ] User context (if available) included

---

## Quality Gate

### Definition of Done

All of the following must be true:

1. **File Sizes**
   - [ ] books/page.tsx < 150 lines
   - [ ] movies/page.tsx < 150 lines
   - [ ] All component files < 200 lines
   - [ ] No file exceeds 400 lines

2. **Code Duplication**
   - [ ] Single EntryForm component used
   - [ ] No duplicate action files
   - [ ] Shared components extracted

3. **Error Handling**
   - [ ] Error boundaries on major sections
   - [ ] Fallback UI implemented
   - [ ] Retry functionality working
   - [ ] Errors logged appropriately

4. **Functionality**
   - [ ] All CRUD operations working
   - [ ] Filters and search working
   - [ ] Statistics accurate
   - [ ] No visual regressions

5. **Code Quality**
   - [ ] TypeScript strict mode passes
   - [ ] ESLint passes
   - [ ] No console.log in components
   - [ ] Build succeeds

---

## Test Scenarios Summary

| Scenario | Type | Priority |
|----------|------|----------|
| Books CRUD operations | Integration | HIGH |
| Movies CRUD operations | Integration | HIGH |
| EntryForm validation | Unit | HIGH |
| Error boundary catch | Unit | MEDIUM |
| Action pagination | Unit | MEDIUM |
| Sentry error reporting | Integration | LOW |

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-28 | spec-builder | Initial acceptance criteria |
