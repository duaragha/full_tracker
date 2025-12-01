# SPEC-QUALITY-001: Implementation Plan

<!-- TAG:SPEC-QUALITY-001:PLAN -->

---

## Overview

This plan outlines the implementation strategy for code quality improvements including large file refactoring, form unification, and error handling.

**Primary Goal**: Reduce file sizes and eliminate code duplication
**Secondary Goal**: Add error boundaries and monitoring

---

## Milestone 1: Books Page Refactoring (Priority: HIGH)

### M1.1: Analyze Current Structure

**Objective**: Map current books/page.tsx structure for extraction

**Current Structure Analysis** (853 lines):
- Imports: ~50 lines
- Type definitions: ~30 lines
- State declarations: ~40 lines
- useEffect hooks: ~100 lines
- Handler functions: ~200 lines
- Render logic: ~430 lines

### M1.2: Create Directory Structure

```bash
mkdir -p app/books/components
```

**Target Structure**:
```
app/books/
├── page.tsx                    # Server component (~100 lines)
├── books-client.tsx            # Main client component (~200 lines)
└── components/
    ├── book-list.tsx          # Book card grid (~100 lines)
    ├── book-filters.tsx       # Filter controls (~80 lines)
    ├── book-stats.tsx         # Statistics display (~60 lines)
    └── book-dialogs.tsx       # Add/Edit/Delete dialogs (~150 lines)
```

### M1.3: Extract Server Component

**File**: `app/books/page.tsx` (NEW - replace existing)

```typescript
// app/books/page.tsx
import { Suspense } from 'react';
import { getBooks, getBookStats } from '@/app/actions/books';
import { BooksClient } from './books-client';
import { BooksLoading } from './components/books-loading';

export const metadata = {
  title: 'Books | Full Tracker',
};

export default async function BooksPage() {
  const [books, stats] = await Promise.all([
    getBooks({ limit: 100 }),
    getBookStats(),
  ]);

  return (
    <Suspense fallback={<BooksLoading />}>
      <BooksClient initialBooks={books} initialStats={stats} />
    </Suspense>
  );
}
```

### M1.4: Extract Client Component

**File**: `app/books/books-client.tsx`

```typescript
'use client';

import { useState, useCallback } from 'react';
import { Book, BookStats } from '@/types/book';
import { BookList } from './components/book-list';
import { BookFilters } from './components/book-filters';
import { BookStats as BookStatsComponent } from './components/book-stats';
import { BookDialogs } from './components/book-dialogs';
import { ErrorBoundary } from '@/components/error-boundary';

interface BooksClientProps {
  initialBooks: Book[];
  initialStats: BookStats;
}

export function BooksClient({ initialBooks, initialStats }: BooksClientProps) {
  const [books, setBooks] = useState(initialBooks);
  const [stats, setStats] = useState(initialStats);
  const [filters, setFilters] = useState<BookFilters>({});
  const [dialogState, setDialogState] = useState<DialogState>({ type: null });

  // Handler functions
  const handleAddBook = useCallback(async (data: BookInput) => {
    // ... implementation
  }, []);

  const handleEditBook = useCallback(async (id: number, data: BookInput) => {
    // ... implementation
  }, []);

  const handleDeleteBook = useCallback(async (id: number) => {
    // ... implementation
  }, []);

  const handleFilterChange = useCallback((newFilters: BookFilters) => {
    setFilters(newFilters);
  }, []);

  // Filter books based on current filters
  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      if (filters.status && book.status !== filters.status) return false;
      if (filters.rating && book.rating < filters.rating) return false;
      if (filters.search && !book.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
  }, [books, filters]);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <ErrorBoundary fallback={<div>Failed to load statistics</div>}>
        <BookStatsComponent stats={stats} />
      </ErrorBoundary>

      <ErrorBoundary fallback={<div>Failed to load filters</div>}>
        <BookFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onAddClick={() => setDialogState({ type: 'add' })}
        />
      </ErrorBoundary>

      <ErrorBoundary fallback={<div>Failed to load books</div>}>
        <BookList
          books={filteredBooks}
          onEdit={(book) => setDialogState({ type: 'edit', book })}
          onDelete={(book) => setDialogState({ type: 'delete', book })}
        />
      </ErrorBoundary>

      <BookDialogs
        state={dialogState}
        onClose={() => setDialogState({ type: null })}
        onAdd={handleAddBook}
        onEdit={handleEditBook}
        onDelete={handleDeleteBook}
      />
    </div>
  );
}
```

### M1.5: Extract Sub-Components

**Files to Create**:
1. `app/books/components/book-list.tsx`
2. `app/books/components/book-filters.tsx`
3. `app/books/components/book-stats.tsx`
4. `app/books/components/book-dialogs.tsx`

Each extracted component follows the single responsibility principle.

---

## Milestone 2: Movies Page Refactoring (Priority: HIGH)

### M2.1: Apply Same Pattern

**Follow books pattern for movies/page.tsx (687 lines)**:

```
app/movies/
├── page.tsx                    # Server component
├── movies-client.tsx           # Main client component
└── components/
    ├── movie-list.tsx
    ├── movie-filters.tsx
    ├── movie-stats.tsx
    └── movie-dialogs.tsx
```

### M2.2: Identify Movie-Specific Components

- TMDB search integration
- Watch status tracking
- Runtime display
- Poster images

---

## Milestone 3: Unified Entry Form (Priority: HIGH)

### M3.1: Create Base Entry Form Component

**File**: `components/ui/entry-form/entry-form.tsx`

```typescript
interface EntryFormProps<T extends MediaType> {
  type: T;
  mode: 'add' | 'edit';
  initialData?: Partial<MediaEntry<T>>;
  onSubmit: (data: MediaEntry<T>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function EntryForm<T extends MediaType>({
  type,
  mode,
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}: EntryFormProps<T>) {
  const config = getFormConfig(type);

  return (
    <form onSubmit={handleSubmit}>
      {/* Common fields */}
      <MediaSearch
        type={type}
        endpoint={config.searchEndpoint}
        onSelect={handleSelect}
      />

      <StatusSelect
        options={config.statusOptions}
        value={status}
        onChange={setStatus}
      />

      <RatingInput
        value={rating}
        onChange={setRating}
        max={config.maxRating || 10}
      />

      {/* Type-specific fields */}
      {config.hasProgress && (
        <ProgressSlider
          value={progress}
          onChange={setProgress}
          max={config.progressMax}
        />
      )}

      {config.hasPlatform && (
        <PlatformSelect
          value={platform}
          onChange={setPlatform}
        />
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {mode === 'add' ? 'Add' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
```

### M3.2: Create Form Configuration

**File**: `components/ui/entry-form/config.ts`

```typescript
type FormConfig = {
  searchEndpoint: string;
  statusOptions: StatusOption[];
  maxRating: number;
  hasProgress: boolean;
  progressMax?: number;
  hasPlatform: boolean;
  hasGenres: boolean;
};

const formConfigs: Record<MediaType, FormConfig> = {
  book: {
    searchEndpoint: '/api/books/search',
    statusOptions: [
      { value: 'to_read', label: 'To Read' },
      { value: 'reading', label: 'Reading' },
      { value: 'finished', label: 'Finished' },
      { value: 'dnf', label: 'Did Not Finish' },
    ],
    maxRating: 10,
    hasProgress: true,
    progressMax: 100,
    hasPlatform: false,
    hasGenres: true,
  },
  movie: {
    searchEndpoint: '/api/tmdb/search',
    statusOptions: [
      { value: 'want_to_watch', label: 'Want to Watch' },
      { value: 'watched', label: 'Watched' },
    ],
    maxRating: 10,
    hasProgress: false,
    hasPlatform: false,
    hasGenres: true,
  },
  game: {
    searchEndpoint: '/api/rawg/search',
    statusOptions: [
      { value: 'backlog', label: 'Backlog' },
      { value: 'playing', label: 'Playing' },
      { value: 'completed', label: 'Completed' },
      { value: 'abandoned', label: 'Abandoned' },
    ],
    maxRating: 10,
    hasProgress: true,
    progressMax: 100,
    hasPlatform: true,
    hasGenres: true,
  },
};

export function getFormConfig(type: MediaType): FormConfig {
  return formConfigs[type];
}
```

### M3.3: Create Shared Field Components

**Files to Create**:
```
components/ui/entry-form/
├── entry-form.tsx
├── config.ts
├── media-search.tsx
├── status-select.tsx
├── rating-input.tsx
├── progress-slider.tsx
├── platform-select.tsx
└── genre-tags.tsx
```

---

## Milestone 4: Error Boundaries (Priority: MEDIUM)

### M4.1: Create Base Error Boundary

**File**: `components/error-boundary.tsx`

```typescript
'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error boundary caught:', error, errorInfo);

    // Report to Sentry if configured
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: { componentStack: errorInfo.componentStack },
        },
      });
    }

    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-medium mb-2">Something went wrong</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button onClick={this.handleRetry} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### M4.2: Wrap Major Page Sections

**Pattern**:
```typescript
// In each page client component
<ErrorBoundary fallback={<StatsFallback />}>
  <StatsSection />
</ErrorBoundary>

<ErrorBoundary fallback={<ListFallback />}>
  <ListSection />
</ErrorBoundary>
```

---

## Milestone 5: Action Consolidation (Priority: MEDIUM)

### M5.1: Unified Action Pattern

**File**: `lib/actions/books.ts` (consolidated)

```typescript
import { revalidatePath } from 'next/cache';
import { pool } from '@/lib/db';

interface GetBooksOptions {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export async function getBooks(options: GetBooksOptions = {}) {
  const {
    page = 1,
    limit = 50,
    status,
    search,
    sort = 'created_at',
    order = 'desc',
  } = options;

  const offset = (page - 1) * limit;
  const params: any[] = [];
  let whereClause = 'WHERE 1=1';

  if (status) {
    params.push(status);
    whereClause += ` AND status = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    whereClause += ` AND title ILIKE $${params.length}`;
  }

  params.push(limit, offset);

  const query = `
    SELECT * FROM books
    ${whereClause}
    ORDER BY ${sort} ${order}
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  const countQuery = `SELECT COUNT(*) FROM books ${whereClause}`;

  const [dataResult, countResult] = await Promise.all([
    pool.query(query, params),
    pool.query(countQuery, params.slice(0, -2)),
  ]);

  return {
    books: dataResult.rows,
    total: parseInt(countResult.rows[0].count),
    page,
    limit,
    totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
  };
}

// Remove separate getPaginatedBooks function - use getBooks with options
```

---

## Milestone 6: Sentry Integration (Priority: LOW)

### M6.1: Install and Configure

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

### M6.2: Configure Sentry Files

**Files Created by Wizard**:
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `next.config.js` (modified)

### M6.3: Environment Variables

```env
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ORG=your-org
SENTRY_PROJECT=full-tracker
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking changes during refactor | Medium | High | Thorough testing, incremental changes |
| Component prop mismatches | Medium | Medium | TypeScript strict mode |
| Performance regression | Low | Medium | Monitor re-renders |
| State management issues | Medium | Medium | Test state transitions |

---

## Verification Checklist

### File Size Verification
- [ ] books/page.tsx < 400 lines
- [ ] movies/page.tsx < 400 lines
- [ ] All extracted components < 200 lines

### Functionality Verification
- [ ] All CRUD operations working
- [ ] Filters functioning
- [ ] Search working
- [ ] Stats displaying correctly

### Error Boundary Verification
- [ ] Errors caught and displayed
- [ ] Retry functionality working
- [ ] Sentry receiving events (if configured)

### Code Quality Verification
- [ ] No TypeScript errors
- [ ] ESLint passes
- [ ] No console.log in components

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-28 | spec-builder | Initial plan creation |
