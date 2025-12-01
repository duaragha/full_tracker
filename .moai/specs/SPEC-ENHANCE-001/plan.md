# SPEC-ENHANCE-001: Implementation Plan

<!-- TAG:SPEC-ENHANCE-001:PLAN -->

---

## Overview

This plan outlines the implementation strategy for application enhancements including analytics dashboard, calendar view, export functionality, and dark mode.

**Primary Goal**: Add analytics and visualization capabilities
**Secondary Goal**: Improve UX with dark mode and export features

---

## Milestone 1: Analytics Dashboard Foundation (Priority: MEDIUM)

### M1.1: Create Analytics Page

**File**: `app/analytics/page.tsx`

```typescript
import { Suspense } from 'react';
import { getAnalyticsData } from '@/app/actions/analytics';
import { AnalyticsClient } from './analytics-client';
import { AnalyticsLoading } from './components/analytics-loading';

export const metadata = {
  title: 'Analytics | Full Tracker',
};

export default async function AnalyticsPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Analytics</h1>
      <Suspense fallback={<AnalyticsLoading />}>
        <AnalyticsClient />
      </Suspense>
    </div>
  );
}
```

### M1.2: Create Analytics Data Actions

**File**: `app/actions/analytics.ts`

```typescript
'use server';

import { pool } from '@/lib/db';

export async function getReadingAnalytics(period: 'week' | 'month' | 'year') {
  // Books per month
  const booksPerMonth = await pool.query(`
    SELECT
      DATE_TRUNC('month', finished_at) as month,
      COUNT(*) as count
    FROM books
    WHERE status = 'finished'
    AND finished_at >= NOW() - INTERVAL '1 year'
    GROUP BY DATE_TRUNC('month', finished_at)
    ORDER BY month
  `);

  // Genre distribution
  const genreDistribution = await pool.query(`
    SELECT
      genre,
      COUNT(*) as count
    FROM books
    WHERE status = 'finished'
    GROUP BY genre
    ORDER BY count DESC
    LIMIT 10
  `);

  return {
    booksPerMonth: booksPerMonth.rows,
    genreDistribution: genreDistribution.rows,
  };
}

export async function getViewingAnalytics(period: 'week' | 'month' | 'year') {
  // Movies per month
  const moviesPerMonth = await pool.query(`
    SELECT
      DATE_TRUNC('month', watched_at) as month,
      COUNT(*) as count
    FROM movies
    WHERE status = 'watched'
    AND watched_at >= NOW() - INTERVAL '1 year'
    GROUP BY DATE_TRUNC('month', watched_at)
    ORDER BY month
  `);

  // Episodes per week
  const episodesPerWeek = await pool.query(`
    SELECT
      DATE_TRUNC('week', watched_at) as week,
      COUNT(*) as count
    FROM tvshow_episodes
    WHERE watched = true
    AND watched_at >= NOW() - INTERVAL '3 months'
    GROUP BY DATE_TRUNC('week', watched_at)
    ORDER BY week
  `);

  return {
    moviesPerMonth: moviesPerMonth.rows,
    episodesPerWeek: episodesPerWeek.rows,
  };
}

export async function getWorkoutAnalytics(period: 'week' | 'month' | 'year') {
  // Workouts per week
  const workoutsPerWeek = await pool.query(`
    SELECT
      DATE_TRUNC('week', started_at) as week,
      COUNT(*) as count,
      SUM(EXTRACT(EPOCH FROM (completed_at - started_at))/60) as total_minutes
    FROM fitness_workouts
    WHERE completed_at IS NOT NULL
    AND started_at >= NOW() - INTERVAL '3 months'
    GROUP BY DATE_TRUNC('week', started_at)
    ORDER BY week
  `);

  // Volume progression (total weight x reps per week)
  const volumePerWeek = await pool.query(`
    SELECT
      DATE_TRUNC('week', w.started_at) as week,
      SUM(s.weight_kg * s.reps) as total_volume
    FROM fitness_sets s
    JOIN fitness_workout_exercises we ON s.workout_exercise_id = we.id
    JOIN fitness_workouts w ON we.workout_id = w.id
    WHERE w.completed_at IS NOT NULL
    AND w.started_at >= NOW() - INTERVAL '3 months'
    GROUP BY DATE_TRUNC('week', w.started_at)
    ORDER BY week
  `);

  return {
    workoutsPerWeek: workoutsPerWeek.rows,
    volumePerWeek: volumePerWeek.rows,
  };
}
```

### M1.3: Create Chart Components

**Directory**: `app/analytics/components/`

**Reading Charts**:
```typescript
// app/analytics/components/reading-charts.tsx
'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe'];

interface ReadingChartsProps {
  booksPerMonth: Array<{ month: string; count: number }>;
  genreDistribution: Array<{ genre: string; count: number }>;
}

export function ReadingCharts({ booksPerMonth, genreDistribution }: ReadingChartsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Books Read Per Month</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={booksPerMonth}>
              <XAxis
                dataKey="month"
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short' })}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Genre Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={genreDistribution}
                dataKey="count"
                nameKey="genre"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {genreDistribution.map((entry, index) => (
                  <Cell key={entry.genre} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Milestone 2: Calendar Timeline View (Priority: MEDIUM)

### M2.1: Create Calendar Page

**File**: `app/calendar/page.tsx`

```typescript
import { Suspense } from 'react';
import { getActivitiesForMonth } from '@/app/actions/calendar';
import { CalendarClient } from './calendar-client';

export const metadata = {
  title: 'Calendar | Full Tracker',
};

export default async function CalendarPage() {
  const today = new Date();
  const activities = await getActivitiesForMonth(today.getFullYear(), today.getMonth());

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Activity Calendar</h1>
      <Suspense fallback={<div>Loading calendar...</div>}>
        <CalendarClient initialActivities={activities} />
      </Suspense>
    </div>
  );
}
```

### M2.2: Create Calendar Component

**File**: `app/calendar/components/activity-calendar.tsx`

```typescript
'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Activity {
  domain: 'books' | 'movies' | 'tvshows' | 'games' | 'workouts';
  title: string;
  date: string;
}

interface ActivityCalendarProps {
  activities: Activity[];
  onDaySelect: (date: Date) => void;
}

const DOMAIN_COLORS = {
  books: 'bg-blue-500',
  movies: 'bg-red-500',
  tvshows: 'bg-purple-500',
  games: 'bg-green-500',
  workouts: 'bg-orange-500',
};

export function ActivityCalendar({ activities, onDaySelect }: ActivityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPadding = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  const getActivitiesForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return activities.filter(a => a.date.startsWith(dateStr));
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <CardTitle>
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </CardTitle>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Padding for first week */}
          {Array.from({ length: startPadding }).map((_, i) => (
            <div key={`pad-${i}`} className="h-24" />
          ))}

          {/* Days */}
          {days.map(day => {
            const dayActivities = getActivitiesForDay(day);
            const isToday =
              day === new Date().getDate() &&
              month === new Date().getMonth() &&
              year === new Date().getFullYear();

            return (
              <div
                key={day}
                className={cn(
                  'h-24 border rounded-md p-1 cursor-pointer hover:bg-muted transition-colors',
                  isToday && 'ring-2 ring-primary'
                )}
                onClick={() => onDaySelect(new Date(year, month, day))}
              >
                <div className="text-sm font-medium">{day}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {/* Activity dots */}
                  {Object.keys(DOMAIN_COLORS).map(domain => {
                    const count = dayActivities.filter(a => a.domain === domain).length;
                    if (count === 0) return null;
                    return (
                      <div
                        key={domain}
                        className={cn(
                          'w-2 h-2 rounded-full',
                          DOMAIN_COLORS[domain as keyof typeof DOMAIN_COLORS]
                        )}
                        title={`${count} ${domain}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Milestone 3: Export Functionality (Priority: LOW)

### M3.1: Create Export API

**File**: `app/api/export/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { exportToExcel } from '@/lib/exporters/excel-exporter';
import { exportToPDF } from '@/lib/exporters/pdf-exporter';
import { getExportData } from '@/lib/exporters/data-fetcher';

export async function POST(req: NextRequest) {
  const { format, domains, startDate, endDate } = await req.json();

  try {
    const data = await getExportData(domains, startDate, endDate);

    let blob: Blob;
    let filename: string;
    let contentType: string;

    switch (format) {
      case 'excel':
        blob = await exportToExcel(data);
        filename = `full-tracker-export-${Date.now()}.xlsx`;
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case 'pdf':
        blob = await exportToPDF(data);
        filename = `full-tracker-export-${Date.now()}.pdf`;
        contentType = 'application/pdf';
        break;
      case 'json':
        blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        filename = `full-tracker-export-${Date.now()}.json`;
        contentType = 'application/json';
        break;
      default:
        return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    }

    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
```

### M3.2: Create Excel Exporter

**File**: `lib/exporters/excel-exporter.ts`

```typescript
import * as XLSX from 'xlsx';

interface ExportData {
  books: any[];
  movies: any[];
  tvshows: any[];
  games: any[];
  workouts: any[];
}

export async function exportToExcel(data: ExportData): Promise<Blob> {
  const workbook = XLSX.utils.book_new();

  // Books sheet
  if (data.books.length > 0) {
    const booksSheet = XLSX.utils.json_to_sheet(data.books.map(book => ({
      Title: book.title,
      Author: book.author,
      Status: book.status,
      Rating: book.rating,
      'Started At': book.started_at,
      'Finished At': book.finished_at,
      Genre: book.genre,
      Pages: book.page_count,
    })));
    XLSX.utils.book_append_sheet(workbook, booksSheet, 'Books');
  }

  // Movies sheet
  if (data.movies.length > 0) {
    const moviesSheet = XLSX.utils.json_to_sheet(data.movies.map(movie => ({
      Title: movie.title,
      Year: movie.year,
      Status: movie.status,
      Rating: movie.rating,
      'Watched At': movie.watched_at,
      Genre: movie.genres,
      Director: movie.director,
    })));
    XLSX.utils.book_append_sheet(workbook, moviesSheet, 'Movies');
  }

  // Add more sheets...

  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
```

### M3.3: Create Export Dialog

**File**: `components/export-dialog.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Download } from 'lucide-react';

export function ExportDialog() {
  const [format, setFormat] = useState<'excel' | 'pdf' | 'json'>('excel');
  const [domains, setDomains] = useState<string[]>(['books', 'movies', 'games']);
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, domains, ...dateRange }),
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1] || 'export';
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Data</DialogTitle>
        </DialogHeader>
        {/* Format selection, domain checkboxes, date pickers, export button */}
      </DialogContent>
    </Dialog>
  );
}
```

---

## Milestone 4: Dark Mode (Priority: LOW)

### M4.1: Install Dependencies

```bash
npm install next-themes
```

### M4.2: Add Theme Provider

**File**: `app/layout.tsx` (modify)

```typescript
import { ThemeProvider } from 'next-themes';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### M4.3: Update CSS Variables

**File**: `app/globals.css`

Add dark mode variables matching shadcn/ui defaults.

### M4.4: Create Theme Toggle

**File**: `components/theme-toggle.tsx`

```typescript
'use client';

import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Monitor } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="h-4 w-4 mr-2" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="h-4 w-4 mr-2" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="h-4 w-4 mr-2" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### M4.5: Add Theme Toggle to Header

Add `<ThemeToggle />` to the header/sidebar component.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Chart performance | Medium | Medium | Use memo, limit data points |
| Export timeout | Medium | Low | Chunk large exports |
| Dark mode flash | Low | Low | Use suppressHydrationWarning |
| Calendar data volume | Low | Medium | Paginate by month |

---

## Verification Checklist

### Analytics
- [ ] All charts render correctly
- [ ] Data refreshes on period change
- [ ] Mobile responsive

### Calendar
- [ ] Month navigation works
- [ ] Activity dots display
- [ ] Day click shows details

### Export
- [ ] Excel downloads correctly
- [ ] PDF generates (if implemented)
- [ ] JSON exports complete data

### Dark Mode
- [ ] Toggle works
- [ ] Preference persists
- [ ] No flash on reload

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-28 | spec-builder | Initial plan creation |
