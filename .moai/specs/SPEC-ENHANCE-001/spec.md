# SPEC-ENHANCE-001: Application Enhancements

<!-- TAG BLOCK -->
<!-- TAG:SPEC-ENHANCE-001 -->
<!-- PARENT:none -->
<!-- STATUS:draft -->
<!-- PRIORITY:low -->
<!-- CREATED:2025-11-28 -->
<!-- UPDATED:2025-11-28 -->

---

## Environment

### Current System State

- **Framework**: Next.js 16.0.1 with App Router
- **UI**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts 2.15.4 (already installed)
- **Date Handling**: date-fns (already installed)
- **Theme**: Light mode only (no dark mode toggle)

### Existing Analytics

| Domain | Current Stats | Gap |
|--------|---------------|-----|
| Books | Basic counts | No time-series, no patterns |
| Movies | Basic counts | No viewing trends |
| Games | Basic counts | No play patterns |
| Workouts | None | No fitness analytics |
| Overall | None | No cross-domain dashboard |

### Export Capabilities

| Format | Status |
|--------|--------|
| JSON | Partial (manual DB export) |
| CSV/Excel | Not implemented |
| PDF | Not implemented |

---

## Assumptions

### A1: Analytics Requirements

- Time-based analysis (daily, weekly, monthly, yearly)
- Cross-domain correlation (optional, future enhancement)
- Historical comparison (this week vs last week)
- Single-user perspective (no multi-user comparisons)

### A2: Export Format Requirements

- Excel: Standard .xlsx format with multiple sheets
- PDF: Formatted report with charts and tables
- Data: All user-specific data for selected date range

### A3: Theme Implementation

- Use CSS variables for theming
- next-themes library for state management
- System preference detection
- Persist user preference

### A4: Calendar View

- Event-driven display (activities on dates)
- Color coding by domain
- Click to view day details
- Navigate months/years

---

## Requirements

### R1: Analytics Dashboard (MEDIUM)

**EARS Pattern**: *State-driven requirement*

**THE SYSTEM** SHALL provide an analytics dashboard
**SHOWING**:
- Reading patterns (books per month, genres over time)
- Watching patterns (movies/episodes per week, time spent)
- Gaming patterns (games completed, time per platform)
- Workout patterns (frequency, volume progression)

**WITH** configurable time periods (week, month, quarter, year)
**SO THAT** users can identify trends and patterns in their habits.

**Dashboard Layout**:
```
+------------------------------------------+
|  Analytics Dashboard                      |
+------------------------------------------+
|  Time Period: [Week | Month | Year]  v   |
+------------------------------------------+
|                                          |
|  +----------------+  +----------------+  |
|  | Books          |  | Movies/TV      |  |
|  | - Monthly      |  | - Weekly       |  |
|  | - By Genre     |  | - By Genre     |  |
|  +----------------+  +----------------+  |
|                                          |
|  +----------------+  +----------------+  |
|  | Games          |  | Workouts       |  |
|  | - By Platform  |  | - Frequency    |  |
|  | - Completion   |  | - Volume       |  |
|  +----------------+  +----------------+  |
|                                          |
|  +--------------------------------------+|
|  | Activity Timeline (Calendar View)    ||
|  +--------------------------------------+|
+------------------------------------------+
```

---

### R2: Reading Analytics (MEDIUM)

**EARS Pattern**: *State-driven requirement*

**THE SYSTEM** SHALL display reading analytics including:
- Books read per month (bar chart)
- Pages read per week (line chart)
- Genre distribution (pie chart)
- Average reading duration per book
- Current streak (consecutive days with reading)

**Implementation**:
```typescript
interface ReadingStats {
  booksPerMonth: { month: string; count: number }[];
  pagesPerWeek: { week: string; pages: number }[];
  genreDistribution: { genre: string; count: number; percentage: number }[];
  averageDaysToComplete: number;
  currentStreak: number;
  longestStreak: number;
}
```

---

### R3: Viewing Analytics (MEDIUM)

**EARS Pattern**: *State-driven requirement*

**THE SYSTEM** SHALL display viewing analytics including:
- Movies watched per month (bar chart)
- TV episodes per week (area chart)
- Genre preferences (pie chart)
- Average rating given
- Watch time estimates

**Implementation**:
```typescript
interface ViewingStats {
  moviesPerMonth: { month: string; count: number }[];
  episodesPerWeek: { week: string; count: number }[];
  genrePreferences: { genre: string; count: number }[];
  averageRating: number;
  totalWatchTimeHours: number;
}
```

---

### R4: Calendar Timeline View (MEDIUM)

**EARS Pattern**: *Event-driven requirement*

**WHEN** a user navigates to the calendar view
**THE SYSTEM** SHALL display:
- Monthly calendar grid
- Activity indicators on dates (colored dots)
- Click to expand day details
- Navigation between months/years

**SO THAT** users can visualize their activities over time.

**Color Coding**:
| Domain | Color |
|--------|-------|
| Books | Blue |
| Movies | Red |
| TV Shows | Purple |
| Games | Green |
| Workouts | Orange |
| Highlights | Yellow |

---

### R5: Export Functionality (LOW)

**EARS Pattern**: *Event-driven requirement*

**WHEN** a user requests data export
**THE SYSTEM** SHALL generate files in the selected format:
- **Excel (.xlsx)**: Multiple sheets (Books, Movies, Games, etc.)
- **PDF**: Formatted report with summary and charts
- **JSON**: Raw data export

**INCLUDING**:
- Selected date range
- Selected domains
- Summary statistics
- Individual entries

**SO THAT** users can backup or analyze their data externally.

---

### R6: Dark Mode Toggle (LOW)

**EARS Pattern**: *Conditional requirement*

**IF** the user toggles dark mode
**THEN** the application SHALL switch to dark theme
**AND** persist the preference across sessions

**IF** the user selects "System" theme
**THEN** the application SHALL follow OS preference

**Implementation**:
- next-themes for state management
- CSS variables for colors
- Smooth transition animation

---

## Specifications

### S1: File Modifications Summary

| File | Change Type | Priority |
|------|-------------|----------|
| `app/analytics/page.tsx` | CREATE | MEDIUM |
| `components/analytics/reading-charts.tsx` | CREATE | MEDIUM |
| `components/analytics/viewing-charts.tsx` | CREATE | MEDIUM |
| `components/analytics/gaming-charts.tsx` | CREATE | MEDIUM |
| `components/analytics/workout-charts.tsx` | CREATE | MEDIUM |
| `app/calendar/page.tsx` | CREATE | MEDIUM |
| `components/calendar/activity-calendar.tsx` | CREATE | MEDIUM |
| `app/api/export/route.ts` | CREATE | LOW |
| `lib/exporters/excel-exporter.ts` | CREATE | LOW |
| `lib/exporters/pdf-exporter.ts` | CREATE | LOW |
| `app/layout.tsx` | MODIFY - Add theme provider | LOW |
| `components/theme-toggle.tsx` | CREATE | LOW |

### S2: Chart Components

**Using Recharts** (already installed):

```typescript
// Example: Books per month bar chart
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function BooksPerMonthChart({ data }: { data: MonthlyBookData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count" fill="hsl(var(--primary))" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

### S3: Calendar Component

**Using react-day-picker** or custom implementation:

```typescript
interface ActivityDay {
  date: Date;
  activities: {
    domain: 'books' | 'movies' | 'games' | 'workouts';
    count: number;
    items: string[];
  }[];
}

export function ActivityCalendar({
  activities,
  onDayClick
}: {
  activities: ActivityDay[];
  onDayClick: (date: Date) => void;
}) {
  // Calendar grid implementation
}
```

### S4: Export Formats

**Excel Export** (using xlsx library - already installed):

```typescript
import * as XLSX from 'xlsx';

export async function exportToExcel(data: ExportData): Promise<Blob> {
  const workbook = XLSX.utils.book_new();

  // Books sheet
  const booksSheet = XLSX.utils.json_to_sheet(data.books);
  XLSX.utils.book_append_sheet(workbook, booksSheet, 'Books');

  // Movies sheet
  const moviesSheet = XLSX.utils.json_to_sheet(data.movies);
  XLSX.utils.book_append_sheet(workbook, moviesSheet, 'Movies');

  // ... additional sheets

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
```

### S5: Dark Mode Configuration

**Theme Variables** (globals.css):

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  /* ... other light mode colors */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... other dark mode colors */
}
```

**Theme Provider** (using next-themes):

```typescript
// app/layout.tsx
import { ThemeProvider } from 'next-themes';

export default function RootLayout({ children }) {
  return (
    <html suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

## Traceability

### Related Documentation

- **Product Doc**: `.moai/project/product.md` - Analytics mentioned
- **Tech Doc**: `.moai/project/tech.md` - Recharts already available
- **shadcn/ui**: Chart components available

### Dependencies

- `SPEC-QUALITY-001` - Page refactoring helpful but not required
- Recharts (already installed)
- xlsx (already installed)
- next-themes (needs installation)

### Success Metrics

- Analytics page load time < 3 seconds
- Charts render within 1 second
- Export completes within 10 seconds for 1000 entries
- Dark mode toggle < 200ms transition
- Calendar navigation smooth (60fps)

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-28 | spec-builder | Initial SPEC creation |
