# SPEC-JOURNAL-001: Journal Feature Implementation

**Version**: 1.0.0
**Status**: draft
**Created**: 2025-12-04
**Author**: spec-builder
**Priority**: HIGH

---

## TAG BLOCK

```
[TAG:SPEC-JOURNAL-001]
[DEPENDS:None]
[IMPLEMENTS:Journal Module]
[TESTED_BY:SPEC-JOURNAL-001-tests]
```

---

## 1. OVERVIEW

### 1.1 Purpose

Implement a comprehensive personal journaling system within Full Tracker that enables users to capture daily thoughts, track moods over time, attach contextual metadata (weather, location, tags), and gain insights through statistics and visualizations.

### 1.2 Scope

This SPEC covers:
- Journal entry CRUD operations with rich text support
- Timeline view for chronological entry browsing
- Calendar view with mood indicators
- Statistics dashboard with writing patterns and mood trends
- Metadata system (mood, weather, location, tags)

Out of scope:
- Media attachments (images/files) - Future enhancement
- Map view - Future enhancement
- Health data integration - Future enhancement
- Entry templates - Future enhancement

### 1.3 Background

Full Tracker currently tracks media consumption, fitness, and other life activities. A journaling feature completes the personal tracking experience by enabling reflection, mood tracking, and capturing life moments that don't fit other categories. Four HTML mockups have been created as the design reference:
- `mockups/journal-entry-editor.html`
- `mockups/journal-timeline.html`
- `mockups/journal-calendar.html`
- `mockups/journal-stats.html`

---

## 2. ENVIRONMENT

### 2.1 Technical Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Frontend | Next.js (App Router) | 16.0.1 |
| UI Framework | React | 19.2.0 |
| Language | TypeScript | 5.x (strict) |
| Database | PostgreSQL | Railway hosted |
| UI Components | shadcn/ui | Latest |
| Charts | recharts | 2.15.4 |
| Date Handling | date-fns | 4.1.0 |
| Validation | Zod | 3.23.0 |

### 2.2 Integration Points

- **Database Layer**: PostgreSQL via `lib/db/` pattern
- **Server Actions**: `lib/actions/` pattern (like `fitness-workouts.ts`)
- **API Routes**: `app/api/v1/` versioned REST endpoints
- **Components**: `components/journal/` feature directory

### 2.3 Existing Patterns to Follow

| Pattern | Reference File | Application |
|---------|---------------|-------------|
| Database Schema | `db/migrations/031_create_fitness_schema.sql` | Journal schema structure |
| Entry Forms | `components/book-entry-form.tsx` | Journal entry form |
| Server Actions | `lib/actions/fitness-workouts.ts` | Journal CRUD actions |
| API Routes | `app/api/v1/workouts/` | Journal API endpoints |

---

## 3. ASSUMPTIONS

### 3.1 User Assumptions

- **A1**: Single user system (no multi-user authentication required)
- **A2**: User wants to capture daily reflections with minimal friction
- **A3**: User values mood tracking and pattern analysis
- **A4**: User prefers dark mode UI (consistent with existing app)

### 3.2 Technical Assumptions

- **A5**: PostgreSQL JSONB suitable for flexible metadata storage
- **A6**: Entry content stored as plain text with optional markdown rendering
- **A7**: Statistics can be computed on-the-fly (no pre-aggregation needed for single user)
- **A8**: Date-based queries are primary access pattern

### 3.3 Business Assumptions

- **A9**: No external API integrations required for core functionality
- **A10**: Weather data entered manually (auto-fetch is future enhancement)

---

## 4. REQUIREMENTS (EARS Format)

### 4.1 Functional Requirements

#### FR-001: Journal Entry Creation
**Ubiquitous**: The system SHALL provide a journal entry creation form with the following fields:
- Title (optional, TEXT, max 200 chars)
- Content (required, TEXT, supports markdown)
- Entry date/time (required, TIMESTAMPTZ, defaults to current)
- Mood (required, ENUM: great/good/okay/bad/terrible)
- Weather (optional, ENUM: sunny/cloudy/rainy/snowy/windy/stormy)
- Location (optional, TEXT, max 100 chars)
- Tags (optional, ARRAY of TEXT, max 10 tags per entry)

#### FR-002: Journal Entry Listing (Timeline View)
**When** the user navigates to the Journal page,
**the system SHALL** display entries in reverse chronological order with:
- Date grouping (Today, Yesterday, specific dates)
- Entry preview (title, truncated content, mood emoji)
- Mood badge, location badge, weather indicator
- Tag pills
- Entry count per day

#### FR-003: Calendar View
**When** the user switches to Calendar view,
**the system SHALL** display:
- Monthly calendar grid with navigation
- Mood color indicator on days with entries
- Entry count indicator per day
- Click-to-expand daily entries list
- Legend for mood colors

#### FR-004: Statistics Dashboard
**When** the user navigates to Stats view,
**the system SHALL** display:
- Total entries count (all time)
- Current writing streak (consecutive days)
- Words written (sum, average per entry)
- Mood distribution pie/bar chart
- Writing frequency over time (monthly bar chart)
- Activity heatmap (GitHub-style yearly grid)
- Top tags list with usage counts

#### FR-005: Entry Search and Filter
**If** the user enters search text or applies filters,
**then** the system SHALL filter entries by:
- Full-text search in title and content
- Mood filter (single or multiple selection)
- Date range filter
- Tag filter

#### FR-006: Entry Edit and Delete
**When** the user selects an existing entry,
**the system SHALL** allow:
- Editing all entry fields
- Deleting the entry with confirmation
- Viewing entry creation/update timestamps

### 4.2 Non-Functional Requirements

#### NFR-001: Performance
- Entry list page load: < 2 seconds with 1000+ entries
- Entry save operation: < 500ms
- Statistics calculation: < 3 seconds for yearly data

#### NFR-002: Usability
- Mobile-responsive layout (same as mockups)
- Keyboard navigation support
- Auto-save draft entries (localStorage)

#### NFR-003: Data Integrity
- No orphaned tag records
- Cascade delete for entry tags
- Unique constraint on entry date+time (prevent duplicates)

---

## 5. SPECIFICATIONS

### 5.1 Database Schema

```sql
-- Migration: 035_create_journal_schema.sql

-- Journal Entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id SERIAL PRIMARY KEY,

  -- Content
  title TEXT,                           -- Optional title (max 200 chars)
  content TEXT NOT NULL,                -- Main entry content (markdown supported)
  word_count INTEGER DEFAULT 0,         -- Calculated on save

  -- Timing
  entry_date DATE NOT NULL,             -- Date of the entry
  entry_time TIME,                      -- Optional specific time
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Mood and Metadata
  mood TEXT NOT NULL,                   -- great, good, okay, bad, terrible
  weather TEXT,                         -- sunny, cloudy, rainy, snowy, windy, stormy
  location TEXT,                        -- Free text location
  activity TEXT,                        -- working, relaxing, exercising, traveling, eating

  -- Constraints
  CONSTRAINT valid_mood CHECK (mood IN ('great', 'good', 'okay', 'bad', 'terrible')),
  CONSTRAINT valid_weather CHECK (weather IS NULL OR weather IN ('sunny', 'cloudy', 'rainy', 'snowy', 'windy', 'stormy')),
  CONSTRAINT valid_title_length CHECK (title IS NULL OR LENGTH(title) <= 200),
  CONSTRAINT valid_location_length CHECK (location IS NULL OR LENGTH(location) <= 100)
);

-- Journal Tags (Many-to-Many)
CREATE TABLE IF NOT EXISTS journal_tags (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,            -- Tag name (lowercase, no spaces)
  usage_count INTEGER DEFAULT 1,        -- Track popularity
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Entry-Tag Association
CREATE TABLE IF NOT EXISTS journal_entry_tags (
  id SERIAL PRIMARY KEY,
  entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES journal_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_entry_tag UNIQUE (entry_id, tag_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_mood ON journal_entries(mood);
CREATE INDEX IF NOT EXISTS idx_journal_entries_created ON journal_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_tags_name ON journal_tags(name);
CREATE INDEX IF NOT EXISTS idx_journal_entry_tags_entry ON journal_entry_tags(entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_tags_tag ON journal_entry_tags(tag_id);

-- Full-text search
CREATE INDEX IF NOT EXISTS idx_journal_entries_search
ON journal_entries USING gin(to_tsvector('english', COALESCE(title, '') || ' ' || content));

-- Trigger: Auto-update updated_at
CREATE OR REPLACE FUNCTION update_journal_entry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_journal_entries_updated_at ON journal_entries;
CREATE TRIGGER trigger_journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_journal_entry_updated_at();

-- Trigger: Calculate word count
CREATE OR REPLACE FUNCTION calculate_journal_word_count()
RETURNS TRIGGER AS $$
BEGIN
  NEW.word_count = array_length(regexp_split_to_array(NEW.content, '\s+'), 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_journal_word_count ON journal_entries;
CREATE TRIGGER trigger_journal_word_count
  BEFORE INSERT OR UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION calculate_journal_word_count();
```

### 5.2 TypeScript Types

```typescript
// types/journal.ts

export type Mood = 'great' | 'good' | 'okay' | 'bad' | 'terrible';
export type Weather = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy' | 'stormy';
export type Activity = 'working' | 'relaxing' | 'exercising' | 'traveling' | 'eating';

export interface JournalTag {
  id: number;
  name: string;
  usageCount: number;
  createdAt: string;
}

export interface JournalEntry {
  id: number;
  title: string | null;
  content: string;
  wordCount: number;
  entryDate: string;       // ISO date string (YYYY-MM-DD)
  entryTime: string | null; // HH:mm format
  createdAt: string;
  updatedAt: string;
  mood: Mood;
  weather: Weather | null;
  location: string | null;
  activity: Activity | null;
  tags: JournalTag[];
}

export interface JournalEntryCreate {
  title?: string;
  content: string;
  entryDate: string;
  entryTime?: string;
  mood: Mood;
  weather?: Weather;
  location?: string;
  activity?: Activity;
  tags?: string[];
}

export interface JournalEntryUpdate extends Partial<JournalEntryCreate> {
  id: number;
}

export interface JournalStats {
  totalEntries: number;
  currentStreak: number;
  longestStreak: number;
  totalWords: number;
  averageWordsPerEntry: number;
  moodDistribution: Record<Mood, number>;
  writingFrequency: { month: string; count: number }[];
  topTags: { name: string; count: number }[];
  entriesByDayOfWeek: Record<string, number>;
}

export interface JournalFilters {
  search?: string;
  moods?: Mood[];
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
}
```

### 5.3 API Endpoints

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/v1/journal` | List entries (paginated) | Query: page, limit, filters | `JournalEntry[]` |
| GET | `/api/v1/journal/[id]` | Get single entry | - | `JournalEntry` |
| POST | `/api/v1/journal` | Create entry | `JournalEntryCreate` | `JournalEntry` |
| PATCH | `/api/v1/journal/[id]` | Update entry | `JournalEntryUpdate` | `JournalEntry` |
| DELETE | `/api/v1/journal/[id]` | Delete entry | - | `{ success: true }` |
| GET | `/api/v1/journal/stats` | Get statistics | Query: period | `JournalStats` |
| GET | `/api/v1/journal/tags` | List all tags | - | `JournalTag[]` |
| GET | `/api/v1/journal/calendar` | Calendar data | Query: year, month | Calendar data |

### 5.4 Component Structure

```
components/journal/
  journal-entry-form.tsx      # Create/Edit form
  journal-entry-card.tsx      # Timeline entry card
  journal-timeline.tsx        # Timeline view container
  journal-calendar.tsx        # Calendar view with mood indicators
  journal-calendar-day.tsx    # Single day cell
  journal-stats.tsx           # Statistics dashboard
  journal-stats-cards.tsx     # Summary stat cards
  journal-mood-chart.tsx      # Mood distribution chart
  journal-frequency-chart.tsx # Writing frequency chart
  journal-heatmap.tsx         # Activity heatmap
  journal-tag-cloud.tsx       # Tag cloud/list
  journal-filters.tsx         # Search and filter controls
  journal-mood-selector.tsx   # Mood selection UI (emoji buttons)
  journal-weather-selector.tsx # Weather selection dropdown
```

### 5.5 Page Routes

```
app/journal/
  page.tsx                    # Main journal page (timeline default)
  new/page.tsx                # New entry page
  [id]/page.tsx               # View/Edit entry page
  calendar/page.tsx           # Calendar view
  stats/page.tsx              # Statistics dashboard
```

---

## 6. CONSTRAINTS

### 6.1 Technical Constraints

- **C1**: Must follow existing Next.js App Router patterns
- **C2**: Must use shadcn/ui components for UI consistency
- **C3**: Must use Server Actions for mutations (not client-side API calls)
- **C4**: Database must be compatible with Railway PostgreSQL
- **C5**: No external dependencies beyond existing package.json

### 6.2 Business Constraints

- **C6**: Single-user system (no authentication required)
- **C7**: Data must persist across sessions (no localStorage-only storage)
- **C8**: Must support existing dark mode theme

---

## 7. RISKS AND MITIGATIONS

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Large entry content causes slow rendering | Medium | Medium | Implement virtualization for timeline, paginate results |
| Statistics queries slow with many entries | Low | Medium | Add database indexes, cache stats where appropriate |
| Markdown rendering XSS vulnerability | Low | High | Use sanitized markdown renderer (react-markdown with rehype-sanitize) |
| Tag autocomplete performance | Low | Low | Limit tags to 100, use trigram index for search |

---

## 8. DEPENDENCIES

### 8.1 Internal Dependencies

- Database migrations system (`db/migrations/`)
- Existing UI component library (`components/ui/`)
- Existing layout and navigation (`app/layout.tsx`)

### 8.2 External Dependencies

None required. All dependencies already in package.json:
- recharts (charts)
- date-fns (date handling)
- zod (validation)
- shadcn/ui components

---

## 9. TRACEABILITY

| Requirement | Implementation | Test |
|-------------|---------------|------|
| FR-001 | `journal-entry-form.tsx`, `lib/actions/journal.ts` | `journal-entry.test.ts` |
| FR-002 | `journal-timeline.tsx`, `app/journal/page.tsx` | `journal-timeline.test.ts` |
| FR-003 | `journal-calendar.tsx`, `app/journal/calendar/page.tsx` | `journal-calendar.test.ts` |
| FR-004 | `journal-stats.tsx`, `app/journal/stats/page.tsx` | `journal-stats.test.ts` |
| FR-005 | `journal-filters.tsx`, `lib/db/journal-store.ts` | `journal-filters.test.ts` |
| FR-006 | `journal-entry-form.tsx`, `lib/actions/journal.ts` | `journal-crud.test.ts` |

---

## 10. HISTORY

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2025-12-04 | 1.0.0 | Initial SPEC creation | spec-builder |
