# SPEC-QUALITY-001: Code Quality Refactoring

<!-- TAG BLOCK -->
<!-- TAG:SPEC-QUALITY-001 -->
<!-- PARENT:none -->
<!-- STATUS:draft -->
<!-- PRIORITY:medium -->
<!-- CREATED:2025-11-28 -->
<!-- UPDATED:2025-11-28 -->

---

## Environment

### Current System State

- **Framework**: Next.js 16.0.1 with App Router
- **Styling**: Tailwind CSS with shadcn/ui components
- **Current Issue**: Large files, code duplication, missing error handling

### File Size Analysis

| File | Lines | Target | Issue |
|------|-------|--------|-------|
| `app/books/page.tsx` | 853 | <400 | Needs component extraction |
| `app/movies/page.tsx` | 687 | <400 | Needs component extraction |
| `app/games/page.tsx` | ~600 | <400 | Similar pattern |
| `app/tvshows/page.tsx` | ~500 | <400 | Similar pattern |

### Code Duplication Analysis

**Entry Forms**:
- `components/book-entry-form.tsx`
- `components/movie-entry-form.tsx`
- `components/game-entry-form.tsx`
- Each shares ~70% similar structure

**Paginated Actions**:
- Non-paginated versions in `app/actions/`
- Paginated versions with duplicate logic
- Inconsistent patterns between modules

### Error Handling Gaps

- No error boundaries around major page sections
- Unhandled promise rejections in some areas
- No Sentry or error tracking integration

---

## Assumptions

### A1: Component Architecture

- Large page components can be split into:
  - Data fetching (server component)
  - UI rendering (client component)
  - Reusable sub-components
- Shared logic can be extracted to hooks

### A2: Form Abstraction

- Entry forms share common patterns:
  - Search/autocomplete field
  - Status selection
  - Rating input
  - Progress tracking
  - Date fields
- A generic EntryForm component can reduce duplication

### A3: Error Boundary Strategy

- Error boundaries should wrap:
  - Major page sections
  - Third-party integrations
  - Data-dependent components
- Fallback UI should allow recovery

### A4: Backward Compatibility

- All refactoring must maintain existing functionality
- No breaking changes to public APIs
- UI should remain visually identical

---

## Requirements

### R1: Large File Decomposition (HIGH)

**EARS Pattern**: *Ubiquitous requirement*

**THE SYSTEM** SHALL maintain page components under 400 lines
**WHERE** complex UI logic is extracted to dedicated components
**AND** related functionality is grouped into sub-component files

**SO THAT** code remains maintainable, testable, and reviewable.

**Target Structure for books/page.tsx**:
```
app/books/
├── page.tsx              # < 150 lines - Server component, data fetching
├── books-client.tsx      # < 250 lines - Main client component
└── components/
    ├── book-list.tsx     # Book card grid
    ├── book-filters.tsx  # Filter controls
    ├── book-stats.tsx    # Statistics display
    └── book-dialogs.tsx  # Add/Edit dialogs
```

---

### R2: Unified Entry Form Component (HIGH)

**EARS Pattern**: *Ubiquitous requirement*

**THE SYSTEM** SHALL use a unified EntryForm component pattern
**FOR** all media types (books, movies, games, TV shows)
**WHERE** common fields are abstracted and type-specific fields are configurable

**SO THAT** form behavior is consistent and maintenance is simplified.

**Component Interface**:
```typescript
interface EntryFormProps<T extends MediaType> {
  type: T;
  mode: 'add' | 'edit';
  initialData?: MediaEntry<T>;
  onSubmit: (data: MediaEntry<T>) => Promise<void>;
  onCancel: () => void;
  searchEndpoint?: string;
  statusOptions: StatusOption[];
  additionalFields?: React.ReactNode;
}
```

---

### R3: Error Boundary Implementation (MEDIUM)

**EARS Pattern**: *Conditional requirement*

**IF** an error occurs in a media page component
**THEN** the error boundary SHALL:
1. Catch the error
2. Display a user-friendly fallback UI
3. Log the error to the monitoring system
4. Provide a retry/recovery action

**INSTEAD OF** crashing the entire application.

**SO THAT** users can continue using other features.

---

### R4: Action Consolidation (MEDIUM)

**EARS Pattern**: *Ubiquitous requirement*

**THE SYSTEM** SHALL consolidate paginated and non-paginated actions
**INTO** unified action files with optional pagination parameters

**SO THAT** code duplication is eliminated and behavior is consistent.

**Unified Action Pattern**:
```typescript
// lib/actions/books.ts
export async function getBooks(options?: {
  page?: number;
  limit?: number;
  status?: BookStatus;
  search?: string;
}) {
  const { page = 1, limit = 50, status, search } = options || {};
  // Single implementation handling both cases
}
```

---

### R5: Error Tracking Integration (LOW)

**EARS Pattern**: *Event-driven requirement*

**WHEN** an error occurs in the application
**THE SYSTEM** SHALL report the error to Sentry
**INCLUDING**:
- Error message and stack trace
- User context (if available)
- Page/component context
- Application version

**SO THAT** production errors can be monitored and resolved.

---

## Specifications

### S1: File Modifications Summary

| File | Change Type | Priority |
|------|-------------|----------|
| `app/books/page.tsx` | REFACTOR - Extract components | HIGH |
| `app/movies/page.tsx` | REFACTOR - Extract components | HIGH |
| `components/ui/entry-form.tsx` | CREATE - Unified form component | HIGH |
| `components/error-boundary.tsx` | CREATE | MEDIUM |
| `app/actions/books.ts` | REFACTOR - Consolidate with paginated | MEDIUM |
| `lib/sentry.ts` | CREATE - Sentry configuration | LOW |

### S2: Component Extraction Strategy

**books/page.tsx Breakdown**:

| Component | Lines (Est.) | Responsibility |
|-----------|--------------|----------------|
| `page.tsx` | 100-150 | Server component, data fetch, layout |
| `BooksClient.tsx` | 200-250 | Client state, handlers, render |
| `BookList.tsx` | 100-150 | Grid display of book cards |
| `BookFilters.tsx` | 80-100 | Status, rating, date filters |
| `BookStats.tsx` | 50-80 | Statistics cards |
| `BookDialogs.tsx` | 150-200 | Add/Edit dialog components |

### S3: Shared Form Fields

| Field Type | Used In | Component |
|------------|---------|-----------|
| Search Autocomplete | All media | `<MediaSearch />` |
| Status Select | All media | `<StatusSelect />` |
| Rating Input | All media | `<RatingInput />` |
| Date Picker | All media | `<DatePicker />` (shadcn) |
| Progress Slider | Books, Games | `<ProgressSlider />` |
| Platform Select | Games | `<PlatformSelect />` |
| Genre Tags | All media | `<GenreTags />` |

### S4: Error Boundary Architecture

```typescript
// components/error-boundary.tsx
interface ErrorBoundaryProps {
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  children: React.ReactNode;
}

// Usage pattern
<ErrorBoundary fallback={<BookErrorFallback />}>
  <BookList books={books} />
</ErrorBoundary>
```

### S5: Sentry Configuration

```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/nextjs';

export function initSentry() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
  });
}

// In error boundary
Sentry.captureException(error, {
  contexts: {
    component: { name: componentName },
  },
});
```

---

## Traceability

### Related Documentation

- **SPEC-SECURITY-001**: Logging should use structured logger (completed first)
- **Design System**: shadcn/ui components
- **Next.js Patterns**: App Router component patterns

### Dependencies

- `SPEC-SECURITY-001` - Structured logging for error reporting
- shadcn/ui components for UI consistency

### Success Metrics

- All page files under 400 lines
- Zero code duplication score above 30% similarity
- Error boundaries on all major sections
- Sentry capturing production errors
- No functionality regression

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-28 | spec-builder | Initial SPEC creation |
