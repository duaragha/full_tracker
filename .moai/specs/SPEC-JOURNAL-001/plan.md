# SPEC-JOURNAL-001: Implementation Plan

**Version**: 1.0.0
**Status**: draft
**Created**: 2025-12-04
**SPEC Reference**: SPEC-JOURNAL-001

---

## TAG BLOCK

```
[TAG:SPEC-JOURNAL-001-PLAN]
[IMPLEMENTS:SPEC-JOURNAL-001]
[PHASE:Planning]
```

---

## 1. IMPLEMENTATION OVERVIEW

### 1.1 Implementation Strategy

The Journal feature will be implemented using a **phased bottom-up approach**:
1. Database schema and types (foundation)
2. Data access layer and server actions (backend)
3. API routes (optional REST endpoints)
4. UI components (atomic to composite)
5. Page routes and integration
6. Testing and polish

### 1.2 Development Approach

- **TDD**: Tests written before implementation for core logic
- **Component-First**: Build and test components in isolation
- **Incremental Delivery**: Each phase produces working functionality

---

## 2. MILESTONES

### Milestone 1: Database Foundation (Priority: HIGH)

**Goal**: Establish database schema and TypeScript types

**Deliverables**:
- `db/migrations/035_create_journal_schema.sql`
- `types/journal.ts`
- Database verification tests

**Tasks**:
1. [ ] Create journal schema migration file
2. [ ] Create TypeScript type definitions
3. [ ] Create Zod validation schemas
4. [ ] Run migration and verify schema
5. [ ] Write schema validation tests

**Dependencies**: None

---

### Milestone 2: Data Access Layer (Priority: HIGH)

**Goal**: Implement data store and server actions

**Deliverables**:
- `lib/db/journal-store.ts`
- `lib/actions/journal.ts`
- Data layer tests

**Tasks**:
1. [ ] Create journal-store.ts with CRUD operations
   - `getEntries(filters, pagination)`
   - `getEntryById(id)`
   - `createEntry(data)`
   - `updateEntry(id, data)`
   - `deleteEntry(id)`
   - `getStats(period)`
   - `getTags()`
   - `getCalendarData(year, month)`
2. [ ] Create server actions in journal.ts
   - `createEntryAction`
   - `updateEntryAction`
   - `deleteEntryAction`
3. [ ] Implement tag management logic
   - Auto-create new tags
   - Update tag usage counts
   - Remove orphaned tags
4. [ ] Write unit tests for store functions
5. [ ] Write integration tests for actions

**Dependencies**: Milestone 1

---

### Milestone 3: API Routes (Priority: MEDIUM)

**Goal**: Expose REST endpoints for journal operations

**Deliverables**:
- `app/api/v1/journal/route.ts` (GET, POST)
- `app/api/v1/journal/[id]/route.ts` (GET, PATCH, DELETE)
- `app/api/v1/journal/stats/route.ts`
- `app/api/v1/journal/tags/route.ts`
- `app/api/v1/journal/calendar/route.ts`

**Tasks**:
1. [ ] Create journal list/create endpoint
2. [ ] Create journal single item endpoints
3. [ ] Create stats endpoint
4. [ ] Create tags endpoint
5. [ ] Create calendar data endpoint
6. [ ] Add request validation with Zod
7. [ ] Add error handling middleware
8. [ ] Write API integration tests

**Dependencies**: Milestone 2

---

### Milestone 4: Core UI Components (Priority: HIGH)

**Goal**: Build reusable journal components

**Deliverables**:
- `components/journal/*.tsx` (all component files)

**Tasks**:
1. [ ] Create mood selector component (emoji buttons)
2. [ ] Create weather selector component
3. [ ] Create tag input component (with autocomplete)
4. [ ] Create journal entry card (timeline item)
5. [ ] Create journal entry form (create/edit)
6. [ ] Create filter controls component
7. [ ] Create stats card components
8. [ ] Create mood distribution chart
9. [ ] Create writing frequency chart
10. [ ] Create activity heatmap component
11. [ ] Create tag cloud component
12. [ ] Create calendar grid component
13. [ ] Create calendar day cell component
14. [ ] Write component tests (React Testing Library)

**Dependencies**: Milestone 2

---

### Milestone 5: Page Routes (Priority: HIGH)

**Goal**: Create page routes and integrate components

**Deliverables**:
- `app/journal/page.tsx` (Timeline view)
- `app/journal/new/page.tsx` (New entry)
- `app/journal/[id]/page.tsx` (View/Edit)
- `app/journal/calendar/page.tsx` (Calendar view)
- `app/journal/stats/page.tsx` (Statistics)

**Tasks**:
1. [ ] Create main journal page (timeline)
   - Entry list with date grouping
   - Pagination/infinite scroll
   - Quick stats cards at top
   - Filter controls
   - New entry button
2. [ ] Create new entry page
   - Full entry form
   - Metadata sidebar
   - Save/cancel actions
3. [ ] Create entry detail/edit page
   - View mode with markdown rendering
   - Edit mode toggle
   - Delete with confirmation
4. [ ] Create calendar page
   - Monthly grid
   - Day selection panel
   - Mood legend
5. [ ] Create stats page
   - Overview cards
   - Charts grid layout
   - Period selector
6. [ ] Add navigation tabs between views
7. [ ] Add to main sidebar navigation
8. [ ] Write page integration tests

**Dependencies**: Milestone 4

---

### Milestone 6: Polish and Testing (Priority: MEDIUM)

**Goal**: Refinement and comprehensive testing

**Deliverables**:
- Complete test suite
- Performance optimizations
- Accessibility improvements

**Tasks**:
1. [ ] Add loading states and skeletons
2. [ ] Add empty states (no entries)
3. [ ] Add error boundaries and error states
4. [ ] Implement auto-save draft (localStorage)
5. [ ] Add keyboard navigation
6. [ ] Add responsive design tweaks
7. [ ] Performance audit and optimization
8. [ ] Accessibility audit (WCAG 2.1 AA)
9. [ ] Write E2E tests (if Playwright configured)
10. [ ] Final QA and bug fixes

**Dependencies**: Milestone 5

---

## 3. TECHNICAL APPROACH

### 3.1 Architecture Decisions

**Decision 1: Server Actions vs API Routes**
- **Choice**: Use Server Actions for mutations, API routes for data fetching
- **Rationale**: Server Actions provide better DX and type safety; API routes allow for potential future integrations

**Decision 2: Tag Storage**
- **Choice**: Separate tags table with many-to-many relationship
- **Rationale**: Enables tag reuse, autocomplete, and usage statistics

**Decision 3: Content Storage**
- **Choice**: Plain text with markdown support, rendered on client
- **Rationale**: Simple storage, flexible rendering, no database schema changes for formatting

**Decision 4: Statistics Calculation**
- **Choice**: Calculate on-demand with database queries
- **Rationale**: Single user, relatively small dataset; pre-aggregation adds complexity

### 3.2 Component Architecture

```
Page (Server Component)
  -> Layout wrapper
  -> Header with navigation tabs
  -> Content area (Client Component for interactivity)
    -> Filter controls (Client)
    -> Entry list/calendar/stats (Client)
  -> Sidebar (if applicable)
```

### 3.3 State Management

- **Server State**: Fetched via Server Actions or API routes
- **UI State**: React useState/useReducer for local component state
- **Form State**: React Hook Form for entry forms
- **Filter State**: URL search params for shareable/bookmarkable filters

### 3.4 Data Fetching Pattern

```typescript
// Page-level data fetching (Server Component)
export default async function JournalPage({ searchParams }) {
  const entries = await getEntriesAction({
    page: searchParams.page || 1,
    filters: parseFilters(searchParams)
  });

  return <JournalTimeline initialEntries={entries} />;
}

// Client-side pagination/filtering
function JournalTimeline({ initialEntries }) {
  const [entries, setEntries] = useState(initialEntries);
  // ... client-side updates
}
```

---

## 4. FILE STRUCTURE

```
full_tracker/
  db/
    migrations/
      035_create_journal_schema.sql     # NEW

  types/
    journal.ts                          # NEW

  lib/
    db/
      journal-store.ts                  # NEW
    actions/
      journal.ts                        # NEW
    validations/
      journal.ts                        # NEW (Zod schemas)

  app/
    api/
      v1/
        journal/
          route.ts                      # NEW (GET, POST)
          [id]/
            route.ts                    # NEW (GET, PATCH, DELETE)
          stats/
            route.ts                    # NEW
          tags/
            route.ts                    # NEW
          calendar/
            route.ts                    # NEW
    journal/
      page.tsx                          # NEW (Timeline)
      new/
        page.tsx                        # NEW (Create entry)
      [id]/
        page.tsx                        # NEW (View/Edit)
      calendar/
        page.tsx                        # NEW
      stats/
        page.tsx                        # NEW

  components/
    journal/
      journal-entry-form.tsx            # NEW
      journal-entry-card.tsx            # NEW
      journal-timeline.tsx              # NEW
      journal-calendar.tsx              # NEW
      journal-calendar-day.tsx          # NEW
      journal-stats.tsx                 # NEW
      journal-stats-cards.tsx           # NEW
      journal-mood-chart.tsx            # NEW
      journal-frequency-chart.tsx       # NEW
      journal-heatmap.tsx               # NEW
      journal-tag-cloud.tsx             # NEW
      journal-filters.tsx               # NEW
      journal-mood-selector.tsx         # NEW
      journal-weather-selector.tsx      # NEW
      index.ts                          # NEW (barrel export)
```

---

## 5. RISK MITIGATION PLAN

### Risk 1: Performance with Large Datasets
**Mitigation**:
- Implement pagination (20 entries per page)
- Add database indexes on frequently queried columns
- Use virtual scrolling for timeline if needed

### Risk 2: Complex Statistics Queries
**Mitigation**:
- Start with simple queries, optimize as needed
- Use database aggregations (GROUP BY) instead of JS processing
- Consider materialized views if performance issues arise

### Risk 3: UI Consistency with Mockups
**Mitigation**:
- Reference mockups during component development
- Use existing shadcn/ui components where possible
- Create custom components only when necessary

---

## 6. QUALITY GATES

### Pre-Implementation Gate
- [ ] SPEC reviewed and approved
- [ ] Mockups analyzed and understood
- [ ] No blocking dependencies

### Per-Milestone Gates
- [ ] All tasks completed
- [ ] Tests written and passing
- [ ] Code reviewed (self-review for personal project)
- [ ] No TypeScript errors
- [ ] No ESLint warnings

### Final Gate
- [ ] All milestones complete
- [ ] Test coverage >= 80% for new code
- [ ] Performance targets met
- [ ] Manual QA passed
- [ ] Documentation updated

---

## 7. IMPLEMENTATION NOTES

### Key Patterns from Existing Code

**From `book-entry-form.tsx`**:
- Form state management with useState
- Grid layout for form fields
- DatePicker component usage
- Submit handler pattern

**From `031_create_fitness_schema.sql`**:
- Table naming convention (`journal_*`)
- Index naming pattern (`idx_journal_*`)
- Trigger naming pattern (`trigger_journal_*`)
- JSONB usage for flexible data

**From `lib/db/*-store.ts`**:
- Query pattern with pg client
- Error handling approach
- Type transformations (snake_case to camelCase)

### UI/UX Notes from Mockups

**Timeline View**:
- Date dividers between entry groups
- Card layout with mood emoji, location badge
- Preview truncation at 3 lines
- Tag pills at bottom of card

**Calendar View**:
- Mood dots on calendar days
- Side panel for selected day's entries
- Monthly stats in sidebar

**Stats View**:
- Top row: summary stat cards
- Second row: 2-column charts (frequency, mood)
- Third row: heatmap + tag list
- Period selector in header

---

## 8. NEXT STEPS

1. Begin with Milestone 1: Create database migration
2. Run migration on local/Railway database
3. Create type definitions
4. Proceed to Milestone 2: Data access layer

**Command to start implementation**:
```
/alfred:2-run SPEC-JOURNAL-001
```

---

## 9. HISTORY

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2025-12-04 | 1.0.0 | Initial plan creation | spec-builder |
