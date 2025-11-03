# Statistics Page - UI Design Specification

**Project:** Full Tracker Statistics Dashboard
**Date:** November 3, 2025
**Version:** 1.0
**Design System:** shadcn/ui with Tailwind CSS

---

## Table of Contents

1. [Design Overview](#design-overview)
2. [Design System Reference](#design-system-reference)
3. [Layout Structure](#layout-structure)
4. [Component Specifications](#component-specifications)
5. [Visual Hierarchy](#visual-hierarchy)
6. [Color System](#color-system)
7. [Typography Scale](#typography-scale)
8. [Spacing & Grid](#spacing--grid)
9. [Interactive States](#interactive-states)
10. [Chart Styling](#chart-styling)
11. [Responsive Breakpoints](#responsive-breakpoints)
12. [Animation Guidelines](#animation-guidelines)
13. [Dark Mode Specifications](#dark-mode-specifications)
14. [Component Catalog](#component-catalog)

---

## Design Overview

### Design Philosophy

The statistics page follows a **data-first, motivation-driven** approach that balances analytical depth with visual simplicity. The design draws inspiration from the existing dashboard's clean card-based layout while introducing rich visualizations that make data meaningful and engaging.

**Core Design Principles:**
- **Clarity Over Complexity**: Every metric should be immediately understandable
- **Consistent Visual Language**: Category colors and patterns used throughout
- **Progressive Disclosure**: Summary first, details on demand
- **Responsive by Default**: Mobile-first approach with graceful desktop enhancement
- **Accessible**: WCAG AA compliance, keyboard navigation, screen reader support
- **Performance-Conscious**: Lightweight animations, lazy loading for charts

### Visual Style

**Aesthetic:** Modern minimalist with subtle depth
- Clean card-based layouts with rounded corners (10px radius)
- Soft shadows for elevation (shadow-sm)
- Generous whitespace for breathing room
- Bold typography for important metrics
- Subtle gradients for visual interest
- Smooth transitions and micro-interactions

---

## Design System Reference

### Existing Components Used

From `/components/ui/`:
- **Card**: Primary container for all stat sections
- **Button**: Actions, period selectors, navigation
- **Badge**: Status indicators, achievement badges, metric tags
- **Tabs**: Category switching, view toggles
- **Additional**: Progress, Tooltip, Accordion, Dialog

### Color Tokens (from globals.css)

**Light Mode:**
```css
--background: oklch(1 0 0)          /* White */
--foreground: oklch(0.145 0 0)      /* Near Black */
--card: oklch(1 0 0)                /* White */
--primary: oklch(0.205 0 0)         /* Dark Gray */
--secondary: oklch(0.97 0 0)        /* Light Gray */
--muted: oklch(0.97 0 0)            /* Light Gray */
--muted-foreground: oklch(0.556 0 0) /* Medium Gray */
--accent: oklch(0.97 0 0)           /* Light Gray */
--destructive: oklch(0.577 0.245 27.325) /* Red */
--border: oklch(0.922 0 0)          /* Light Border */
```

**Dark Mode:**
```css
--background: oklch(0 0 0)          /* Black */
--foreground: oklch(0.985 0 0)      /* White */
--card: oklch(0.05 0 0)             /* Dark Gray */
--primary: oklch(0.922 0 0)         /* Light Gray */
--border: oklch(1 0 0 / 8%)         /* Subtle Border */
```

### Typography

**Font Family:**
- Sans: `var(--font-geist-sans)` (Geist Sans)
- Mono: `var(--font-geist-mono)` (Geist Mono)

**Font Weights:**
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700

---

## Layout Structure

### Page Grid System

The statistics page uses a **responsive grid layout** with the following structure:

```
┌─────────────────────────────────────────────────────────────┐
│ Page Header                                                 │
│ - Title, description, period selector                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Hero Section (Quick Stats)                                  │
│ Grid: 2 cols mobile, 4 cols tablet, 6 cols desktop         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Streak & Activity Heatmap                                   │
│ Full-width card with calendar visualization                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Time Investment Overview                                    │
│ Grid: 1 col mobile, 2 cols tablet, 3 cols desktop          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Category Deep Dive Tabs                                     │
│ Tabbed interface with category-specific stats              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Achievements & Milestones                                   │
│ Grid: 3 cols mobile, 5 cols tablet, 8 cols desktop         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Comparisons & Trends                                        │
│ Grid: 1 col mobile, 2 cols tablet, 4 cols desktop          │
└─────────────────────────────────────────────────────────────┘
```

### Container Specifications

```tsx
// Page Container
className="space-y-4 sm:space-y-6"

// Section Container
className="space-y-3 sm:space-y-4"

// Grid Containers
// Quick Stats Grid
className="grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6"

// Chart Grid
className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"

// Achievement Grid
className="grid gap-2 grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8"
```

---

## Component Specifications

### 1. Page Header

**Visual Mockup Description:**
A clean header with title, subtitle, and prominent period selector

**Component Structure:**
```tsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
  <div>
    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Statistics</h1>
    <p className="text-sm sm:text-base text-muted-foreground">
      Your tracking insights and achievements
    </p>
  </div>
  <PeriodSelector />
</div>
```

**Styling Details:**
- Title: `text-2xl sm:text-3xl font-bold tracking-tight`
- Subtitle: `text-sm sm:text-base text-muted-foreground`
- Spacing: `gap-4` between elements
- Responsive: Stack on mobile, side-by-side on desktop

---

### 2. Period Selector

**Visual Mockup Description:**
Toggle button group with active state highlighting

**Component Structure:**
```tsx
<div className="inline-flex items-center gap-1 p-1 bg-muted rounded-lg">
  <Button
    variant={period === 'week' ? 'default' : 'ghost'}
    size="sm"
    className="h-8 px-3"
  >
    Week
  </Button>
  <Button
    variant={period === 'month' ? 'default' : 'ghost'}
    size="sm"
    className="h-8 px-3"
  >
    Month
  </Button>
  <Button
    variant={period === 'year' ? 'default' : 'ghost'}
    size="sm"
    className="h-8 px-3"
  >
    Year
  </Button>
  <Button
    variant={period === 'all' ? 'default' : 'ghost'}
    size="sm"
    className="h-8 px-3"
  >
    All Time
  </Button>
</div>
```

**Styling Details:**
- Container: `bg-muted rounded-lg p-1`
- Button height: `h-8`
- Active state: `variant="default"` (dark background)
- Inactive state: `variant="ghost"` (transparent)
- Transition: `transition-all duration-200`

**Interactive States:**
- Hover: Subtle background change on ghost buttons
- Active: Primary background with shadow
- Focus: Ring outline for keyboard navigation

---

### 3. Stat Card (Quick Stats)

**Visual Mockup Description:**
Compact card showing a single metric with label, value, and trend indicator

**Component Structure:**
```tsx
<Card>
  <CardHeader className="pb-2">
    <div className="flex items-start justify-between">
      <CardDescription className="text-xs font-medium">
        Total Games
      </CardDescription>
      {trend && (
        <Badge variant="outline" className="text-[10px] h-5 gap-0.5">
          <TrendingUp className="w-3 h-3" />
          +12%
        </Badge>
      )}
    </div>
    <CardTitle className="text-2xl font-bold">
      {value}
    </CardTitle>
  </CardHeader>
</Card>
```

**Sizing Specifications:**
- Minimum height: `min-h-[90px]`
- Card padding: `py-4 px-4` (reduced from default 6)
- Value font size: `text-2xl sm:text-3xl`
- Label font size: `text-xs`
- Trend badge: `text-[10px] h-5`

**Styling Details:**
- Border: `border border-border`
- Background: `bg-card`
- Shadow: `shadow-sm`
- Radius: `rounded-xl` (10px)
- Hover: `hover:shadow-md transition-shadow`

**Variants:**

**Standard Stat Card:**
```tsx
className="border-border bg-card"
```

**Highlighted Stat Card** (for primary metrics):
```tsx
className="border-primary/20 bg-primary/5 dark:bg-primary/10"
```

**Category Stat Card** (with category color accent):
```tsx
// Games (Purple)
className="border-purple-200 bg-purple-50 dark:border-purple-900/30 dark:bg-purple-950/30"

// Books (Orange)
className="border-orange-200 bg-orange-50 dark:border-orange-900/30 dark:bg-orange-950/30"

// TV Shows (Blue)
className="border-blue-200 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-950/30"
```

---

### 4. Trend Indicator Badge

**Visual Mockup Description:**
Small badge showing percentage change with arrow icon

**Component Structure:**
```tsx
// Positive Trend
<Badge
  variant="outline"
  className="text-[10px] h-5 gap-0.5 text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-900/30 dark:bg-green-950/30"
>
  <TrendingUp className="w-3 h-3" />
  +12%
</Badge>

// Negative Trend
<Badge
  variant="outline"
  className="text-[10px] h-5 gap-0.5 text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-900/30 dark:bg-red-950/30"
>
  <TrendingDown className="w-3 h-3" />
  -8%
</Badge>

// Neutral Trend
<Badge
  variant="outline"
  className="text-[10px] h-5 gap-0.5 text-muted-foreground"
>
  <Minus className="w-3 h-3" />
  0%
</Badge>
```

**Color Coding:**
- Positive (Up): Green (#22C55E light, #4ADE80 dark)
- Negative (Down): Red (#EF4444 light, #F87171 dark)
- Neutral: Muted foreground

---

### 5. Large Metric Card

**Visual Mockup Description:**
Prominent card for key statistics with icon, large value, and supporting text

**Component Structure:**
```tsx
<Card>
  <CardHeader className="pb-3">
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
        <Trophy className="h-6 w-6 text-primary" />
      </div>
      <div className="flex-1">
        <CardTitle className="text-4xl font-bold">
          127
        </CardTitle>
        <CardDescription className="text-sm">
          Day Streak
        </CardDescription>
      </div>
    </div>
  </CardHeader>
  <CardContent>
    <p className="text-xs text-muted-foreground">
      Your longest streak ever! Keep it going.
    </p>
  </CardContent>
</Card>
```

**Styling Details:**
- Icon container: `h-12 w-12 rounded-lg bg-primary/10`
- Icon size: `h-6 w-6`
- Value size: `text-4xl sm:text-5xl font-bold`
- Description: `text-sm text-muted-foreground`
- Supporting text: `text-xs text-muted-foreground`

---

### 6. Chart Card

**Visual Mockup Description:**
Card containing a chart with title, subtitle, and optional legend

**Component Structure:**
```tsx
<Card>
  <CardHeader className="pb-2">
    <div className="flex items-start justify-between">
      <div>
        <CardTitle className="text-lg font-semibold">
          Time Investment
        </CardTitle>
        <CardDescription className="text-xs">
          Hours per category this month
        </CardDescription>
      </div>
      <Button variant="ghost" size="icon-sm">
        <MoreVertical className="h-4 w-4" />
      </Button>
    </div>
  </CardHeader>
  <CardContent>
    <div className="h-[300px] sm:h-[350px]">
      {/* Chart Component */}
    </div>
  </CardContent>
  <CardFooter className="pt-0">
    <p className="text-xs text-muted-foreground">
      Total: 127 hours tracked this month
    </p>
  </CardFooter>
</Card>
```

**Chart Container Specifications:**
- Mobile height: `h-[250px]`
- Tablet height: `h-[300px]`
- Desktop height: `h-[350px]`
- Padding: `px-0` (charts handle their own padding)

**Chart Title Specifications:**
- Title: `text-lg font-semibold`
- Subtitle: `text-xs text-muted-foreground`
- Footer text: `text-xs text-muted-foreground`

---

### 7. Activity Heatmap Card

**Visual Mockup Description:**
Full-width card with GitHub-style contribution graph

**Component Structure:**
```tsx
<Card className="col-span-full">
  <CardHeader className="pb-2">
    <div className="flex items-center justify-between">
      <div>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Activity Heatmap
        </CardTitle>
        <CardDescription className="text-xs">
          Your tracking activity over the past year
        </CardDescription>
      </div>
      <Badge variant="outline" className="font-mono">
        127 day streak
      </Badge>
    </div>
  </CardHeader>
  <CardContent>
    <div className="overflow-x-auto">
      {/* Heatmap visualization */}
    </div>
  </CardContent>
</Card>
```

**Heatmap Styling:**
- Cell size: `w-3 h-3` (12x12px)
- Cell gap: `gap-1`
- Cell radius: `rounded-sm`
- Month labels: `text-xs text-muted-foreground mb-1`
- Weekday labels: `text-[10px] text-muted-foreground`

**Heatmap Color Scale:**
```css
/* No activity */
.heatmap-level-0 { background: oklch(0.97 0 0); } /* Light gray */

/* Low activity (1-2 items) */
.heatmap-level-1 { background: oklch(0.9 0.05 264); } /* Light blue */

/* Medium activity (3-5 items) */
.heatmap-level-2 { background: oklch(0.7 0.15 264); } /* Medium blue */

/* High activity (6-10 items) */
.heatmap-level-3 { background: oklch(0.5 0.2 264); } /* Bright blue */

/* Very high activity (10+ items) */
.heatmap-level-4 { background: oklch(0.35 0.25 264); } /* Dark blue */
```

**Dark Mode:**
```css
.dark .heatmap-level-0 { background: oklch(0.1 0 0); }
.dark .heatmap-level-1 { background: oklch(0.25 0.1 264); }
.dark .heatmap-level-2 { background: oklch(0.4 0.15 264); }
.dark .heatmap-level-3 { background: oklch(0.55 0.2 264); }
.dark .heatmap-level-4 { background: oklch(0.7 0.25 264); }
```

---

### 8. Achievement Badge

**Visual Mockup Description:**
Circular or shield-shaped badge with icon, locked/unlocked state

**Component Structure:**
```tsx
// Unlocked Achievement
<div className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer">
  <div className="relative">
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg">
      <Trophy className="h-7 w-7 text-white" />
    </div>
    <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 border-2 border-background">
      <Check className="h-3 w-3 text-white" />
    </div>
  </div>
  <div className="text-center">
    <p className="text-xs font-semibold">Century Club</p>
    <p className="text-[10px] text-muted-foreground">100 items tracked</p>
  </div>
</div>

// Locked Achievement
<div className="flex flex-col items-center gap-2 p-3 rounded-lg opacity-40">
  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
    <Lock className="h-6 w-6 text-muted-foreground" />
  </div>
  <div className="text-center">
    <p className="text-xs font-semibold">Marathon Reader</p>
    <p className="text-[10px] text-muted-foreground">Read 50 books</p>
  </div>
</div>
```

**Badge Specifications:**
- Badge size: `h-14 w-14` (56x56px)
- Icon size: `h-7 w-7` (28x28px)
- Border radius: `rounded-full`
- Shadow: `shadow-lg` for unlocked
- Opacity: `opacity-40` for locked

**Achievement Tiers (by gradient color):**
```css
/* Bronze */
.achievement-bronze {
  background: linear-gradient(135deg, #CD7F32 0%, #A0522D 100%);
}

/* Silver */
.achievement-silver {
  background: linear-gradient(135deg, #C0C0C0 0%, #A9A9A9 100%);
}

/* Gold */
.achievement-gold {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
}

/* Platinum */
.achievement-platinum {
  background: linear-gradient(135deg, #E5E4E2 0%, #B9D9EB 100%);
}

/* Diamond */
.achievement-diamond {
  background: linear-gradient(135deg, #B9F2FF 0%, #4FC3F7 100%);
}
```

---

### 9. Comparison Card

**Visual Mockup Description:**
Side-by-side comparison of two time periods with percentage change

**Component Structure:**
```tsx
<Card>
  <CardHeader className="pb-2">
    <CardTitle className="text-base font-semibold">
      Games Played
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      {/* Current Period */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">This Month</p>
        <p className="text-3xl font-bold">24</p>
      </div>

      {/* Comparison */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-border" />
        <Badge variant="outline" className="text-xs">
          <TrendingUp className="w-3 h-3 mr-1" />
          +33%
        </Badge>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Previous Period */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">Last Month</p>
        <p className="text-2xl font-semibold text-muted-foreground">18</p>
      </div>
    </div>
  </CardContent>
</Card>
```

**Styling Details:**
- Current value: `text-3xl font-bold`
- Previous value: `text-2xl font-semibold text-muted-foreground`
- Divider: `h-px bg-border`
- Period labels: `text-xs text-muted-foreground`

---

### 10. Category Tab Panel

**Visual Mockup Description:**
Tabbed interface for switching between category deep dives

**Component Structure:**
```tsx
<Tabs defaultValue="games" className="space-y-4">
  <TabsList className="w-full sm:w-auto">
    <TabsTrigger value="games" className="flex items-center gap-1.5">
      <Gamepad2 className="h-4 w-4" />
      <span className="hidden sm:inline">Games</span>
    </TabsTrigger>
    <TabsTrigger value="books" className="flex items-center gap-1.5">
      <Book className="h-4 w-4" />
      <span className="hidden sm:inline">Books</span>
    </TabsTrigger>
    <TabsTrigger value="tvshows" className="flex items-center gap-1.5">
      <Tv className="h-4 w-4" />
      <span className="hidden sm:inline">TV Shows</span>
    </TabsTrigger>
    {/* More tabs... */}
  </TabsList>

  <TabsContent value="games" className="space-y-4">
    {/* Category-specific content */}
  </TabsContent>
</Tabs>
```

**Tab Styling:**
- Tab list: `bg-muted rounded-lg p-1`
- Tab trigger height: `h-9`
- Active tab: `bg-background shadow-sm`
- Icon size: `h-4 w-4`
- Text hidden on mobile: `hidden sm:inline`

---

### 11. Progress Ring

**Visual Mockup Description:**
Circular progress indicator for completion percentages

**Component Structure:**
```tsx
<div className="relative inline-flex">
  {/* SVG Circle */}
  <svg className="w-24 h-24 transform -rotate-90">
    <circle
      cx="48"
      cy="48"
      r="40"
      stroke="currentColor"
      strokeWidth="8"
      fill="none"
      className="text-muted"
    />
    <circle
      cx="48"
      cy="48"
      r="40"
      stroke="currentColor"
      strokeWidth="8"
      fill="none"
      strokeDasharray={`${progress * 2.51} 251`}
      className="text-primary transition-all duration-500"
    />
  </svg>

  {/* Center Text */}
  <div className="absolute inset-0 flex flex-col items-center justify-center">
    <span className="text-2xl font-bold">{progress}%</span>
    <span className="text-[10px] text-muted-foreground">Complete</span>
  </div>
</div>
```

**Sizing Options:**
- Small: `w-16 h-16` with `text-lg` center value
- Medium: `w-24 h-24` with `text-2xl` center value
- Large: `w-32 h-32` with `text-3xl` center value

---

### 12. Sparkline Chart

**Visual Mockup Description:**
Tiny line chart showing trend within a stat card

**Component Structure:**
```tsx
<div className="h-8 w-full">
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={data}>
      <Line
        type="monotone"
        dataKey="value"
        stroke="currentColor"
        strokeWidth={1.5}
        dot={false}
        className="text-primary"
      />
    </LineChart>
  </ResponsiveContainer>
</div>
```

**Sparkline Specifications:**
- Height: `h-8` (32px)
- Stroke width: `1.5px`
- No axes or labels
- Smooth curve: `type="monotone"`
- Color: Inherits from `text-primary`

---

## Visual Hierarchy

### Information Priority Levels

**Level 1 - Hero Metrics** (Largest, most prominent):
- Current streak
- Total tracked items
- This month's activity summary
- Time investment overview

**Visual Treatment:**
- Font size: `text-4xl` to `text-5xl`
- Font weight: `font-bold`
- Color: Full saturation foreground
- Position: Top of page, above the fold
- Spacing: Generous padding and margins

**Level 2 - Category Summaries** (Secondary emphasis):
- Category totals
- Completion rates
- Trend indicators
- Recent achievements

**Visual Treatment:**
- Font size: `text-2xl` to `text-3xl`
- Font weight: `font-semibold`
- Color: Standard foreground
- Position: Second section, cards with borders
- Spacing: Medium padding

**Level 3 - Detailed Metrics** (Tertiary details):
- Individual chart data points
- Historical comparisons
- Subcategory breakdowns
- Supporting text

**Visual Treatment:**
- Font size: `text-sm` to `text-base`
- Font weight: `font-medium`
- Color: Muted foreground
- Position: Within expanded sections
- Spacing: Compact padding

**Level 4 - Metadata** (Smallest, least emphasis):
- Timestamps
- Labels
- Tooltips
- Helper text

**Visual Treatment:**
- Font size: `text-xs` to `text-[10px]`
- Font weight: `font-normal`
- Color: `text-muted-foreground`
- Position: Below or beside main content
- Spacing: Minimal padding

---

## Color System

### Category Color Palette

**Primary Category Colors:**

```css
/* Games - Purple */
--category-games: #8B5CF6;
--category-games-light: #EDE9FE;
--category-games-dark: #6D28D9;

/* Books - Orange */
--category-books: #F59E0B;
--category-books-light: #FEF3C7;
--category-books-dark: #D97706;

/* TV Shows - Blue */
--category-tvshows: #3B82F6;
--category-tvshows-light: #DBEAFE;
--category-tvshows-dark: #2563EB;

/* Movies - Red */
--category-movies: #EF4444;
--category-movies-light: #FEE2E2;
--category-movies-dark: #DC2626;

/* PHEV - Green */
--category-phev: #10B981;
--category-phev-light: #D1FAE5;
--category-phev-dark: #059669;

/* Inventory - Slate */
--category-inventory: #64748B;
--category-inventory-light: #F1F5F9;
--category-inventory-dark: #475569;

/* Jobs - Indigo */
--category-jobs: #6366F1;
--category-jobs-light: #E0E7FF;
--category-jobs-dark: #4F46E5;
```

**Usage in Tailwind:**
```tsx
// Games accent
className="text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-950/30 dark:border-purple-900/30"

// Books accent
className="text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950/30 dark:border-orange-900/30"

// TV Shows accent
className="text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-900/30"
```

### Semantic Color System

**Status Colors:**

```css
/* Success/Positive */
--color-success: #22C55E;
--color-success-bg: #F0FDF4;
--color-success-border: #BBF7D0;

/* Warning */
--color-warning: #EAB308;
--color-warning-bg: #FEFCE8;
--color-warning-border: #FEF08A;

/* Error/Negative */
--color-error: #EF4444;
--color-error-bg: #FEF2F2;
--color-error-border: #FECACA;

/* Info */
--color-info: #3B82F6;
--color-info-bg: #EFF6FF;
--color-info-border: #BFDBFE;

/* Neutral */
--color-neutral: #6B7280;
--color-neutral-bg: #F9FAFB;
--color-neutral-border: #E5E7EB;
```

**Usage in Components:**
```tsx
// Success badge
className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/30"

// Warning badge
className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-900/30"
```

### Chart Color Palette

**Primary Chart Colors** (from globals.css):
```css
--chart-1: oklch(0.646 0.222 41.116)  /* Orange */
--chart-2: oklch(0.6 0.118 184.704)    /* Cyan */
--chart-3: oklch(0.398 0.07 227.392)   /* Blue */
--chart-4: oklch(0.828 0.189 84.429)   /* Yellow-Green */
--chart-5: oklch(0.769 0.188 70.08)    /* Coral */
```

**Chart Color Usage:**
- Use category colors for single-category charts
- Use chart-1 through chart-5 for multi-category charts
- Ensure 4.5:1 contrast ratio for text on chart colors
- Use 50% opacity for inactive/background chart elements

---

## Typography Scale

### Font Size Scale

```css
/* Display - Hero Numbers */
.text-display {
  font-size: 3rem;      /* 48px */
  line-height: 1;
  font-weight: 700;
  letter-spacing: -0.02em;
}
/* Usage: Large metric values, hero stats */

/* Headline 1 - Page Titles */
.text-h1 {
  font-size: 1.875rem;  /* 30px */
  line-height: 2.25rem; /* 36px */
  font-weight: 700;
}
/* Usage: Main page title */

/* Headline 2 - Section Titles */
.text-h2 {
  font-size: 1.5rem;    /* 24px */
  line-height: 2rem;    /* 32px */
  font-weight: 600;
}
/* Usage: Card titles, section headers */

/* Headline 3 - Card Titles */
.text-h3 {
  font-size: 1.125rem;  /* 18px */
  line-height: 1.75rem; /* 28px */
  font-weight: 600;
}
/* Usage: Card headers, chart titles */

/* Body Large - Important Text */
.text-body-lg {
  font-size: 1rem;      /* 16px */
  line-height: 1.5rem;  /* 24px */
  font-weight: 400;
}
/* Usage: Primary body text, descriptions */

/* Body - Default Text */
.text-body {
  font-size: 0.875rem;  /* 14px */
  line-height: 1.25rem; /* 20px */
  font-weight: 400;
}
/* Usage: Secondary text, labels */

/* Small - Supporting Text */
.text-small {
  font-size: 0.75rem;   /* 12px */
  line-height: 1rem;    /* 16px */
  font-weight: 400;
}
/* Usage: Captions, metadata, helper text */

/* Tiny - Micro Text */
.text-tiny {
  font-size: 0.625rem;  /* 10px */
  line-height: 0.875rem;/* 14px */
  font-weight: 400;
}
/* Usage: Timestamps, minor labels */
```

### Responsive Typography

**Mobile-first scaling:**
```tsx
// Page Title
className="text-2xl sm:text-3xl font-bold"

// Section Title
className="text-lg sm:text-xl font-semibold"

// Card Title
className="text-base sm:text-lg font-semibold"

// Body Text
className="text-sm sm:text-base"

// Small Text
className="text-xs sm:text-sm"
```

### Typography Pairing Guidelines

**Hero Metric:**
```tsx
<div>
  <p className="text-5xl font-bold">127</p>
  <p className="text-sm text-muted-foreground">Day Streak</p>
</div>
```

**Stat Card:**
```tsx
<div>
  <p className="text-xs font-medium text-muted-foreground">Total Games</p>
  <p className="text-3xl font-bold">48</p>
  <p className="text-xs text-muted-foreground">+12% from last month</p>
</div>
```

**Chart Header:**
```tsx
<div>
  <h3 className="text-lg font-semibold">Time Investment</h3>
  <p className="text-xs text-muted-foreground">Last 6 months</p>
</div>
```

---

## Spacing & Grid

### Spacing System

**Spacing Scale** (based on 4px base unit):

```css
--spacing-0: 0px;      /* 0 */
--spacing-0.5: 2px;    /* 0.125rem */
--spacing-1: 4px;      /* 0.25rem */
--spacing-1.5: 6px;    /* 0.375rem */
--spacing-2: 8px;      /* 0.5rem */
--spacing-3: 12px;     /* 0.75rem */
--spacing-4: 16px;     /* 1rem */
--spacing-5: 20px;     /* 1.25rem */
--spacing-6: 24px;     /* 1.5rem */
--spacing-8: 32px;     /* 2rem */
--spacing-10: 40px;    /* 2.5rem */
--spacing-12: 48px;    /* 3rem */
--spacing-16: 64px;    /* 4rem */
```

### Component Spacing Rules

**Card Padding:**
```tsx
// Default card padding
className="p-6"

// Compact card padding (for stat cards)
className="p-4"

// Card header padding
className="pb-3"

// Card content padding
className="px-6"
```

**Grid Gaps:**
```tsx
// Tight grid (achievement badges)
className="gap-2"

// Default grid (stat cards)
className="gap-3 sm:gap-4"

// Loose grid (large cards)
className="gap-4 sm:gap-6"
```

**Section Spacing:**
```tsx
// Between sections
className="space-y-4 sm:space-y-6"

// Within sections
className="space-y-3 sm:space-y-4"

// Tight spacing (related items)
className="space-y-2"
```

### Grid Column Definitions

**Quick Stats Grid:**
```tsx
// 2 columns mobile, 4 tablet, 6 desktop
className="grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6"
```

**Chart Grid:**
```tsx
// 1 column mobile, 2 tablet, 3 desktop
className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
```

**Achievement Grid:**
```tsx
// 3 columns mobile, 5 tablet, 8 desktop
className="grid gap-2 grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8"
```

**Comparison Grid:**
```tsx
// 1 column mobile, 2 tablet, 4 desktop
className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
```

---

## Interactive States

### Button States

**Default Button:**
```tsx
// Default state
className="bg-primary text-primary-foreground"

// Hover state
className="hover:bg-primary/90"

// Active state
className="active:scale-95"

// Focus state
className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

// Disabled state
className="disabled:opacity-50 disabled:pointer-events-none"
```

**Ghost Button:**
```tsx
// Default state
className="bg-transparent"

// Hover state
className="hover:bg-accent hover:text-accent-foreground"

// Active state
className="active:bg-accent/80"
```

### Card States

**Default Card:**
```tsx
// Default state
className="border border-border bg-card shadow-sm"

// Hover state (for clickable cards)
className="hover:shadow-md hover:border-primary/20 transition-all duration-200"

// Focus state
className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

// Active/Selected state
className="border-primary bg-primary/5 shadow-md"
```

### Chart Interaction States

**Chart Elements:**
```tsx
// Hover on chart segment
{
  strokeWidth: 2,        // Default
  strokeWidth: 3,        // Hover (thicker)
}

// Active chart segment
{
  opacity: 1,            // Default
  opacity: 0.6,          // Inactive segments when one is hovered
}

// Tooltip
className="bg-popover text-popover-foreground shadow-lg border border-border rounded-lg p-2"
```

### Achievement Badge States

**Unlocked Achievement:**
```tsx
// Default state
className="opacity-100"

// Hover state
className="hover:scale-105 transition-transform duration-200"

// Active state
className="active:scale-95"
```

**Locked Achievement:**
```tsx
// Default state
className="opacity-40 grayscale"

// Hover state
className="hover:opacity-60 transition-opacity"
```

---

## Chart Styling

### Chart Configuration Standards

**Common Chart Props:**
```tsx
{
  margin: { top: 10, right: 10, bottom: 10, left: 10 },
  fontFamily: 'var(--font-geist-sans)',
  fontSize: 12,
}
```

### Line Chart Styling

**Configuration:**
```tsx
<LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
  <CartesianGrid
    strokeDasharray="3 3"
    stroke="currentColor"
    className="text-border opacity-50"
  />
  <XAxis
    dataKey="date"
    stroke="currentColor"
    className="text-muted-foreground"
    tick={{ fontSize: 11 }}
    tickLine={false}
  />
  <YAxis
    stroke="currentColor"
    className="text-muted-foreground"
    tick={{ fontSize: 11 }}
    tickLine={false}
    axisLine={false}
  />
  <Tooltip
    contentStyle={{
      backgroundColor: 'hsl(var(--popover))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '0.5rem',
      fontSize: '12px',
    }}
  />
  <Line
    type="monotone"
    dataKey="value"
    stroke="hsl(var(--primary))"
    strokeWidth={2}
    dot={{ fill: 'hsl(var(--primary))', r: 4 }}
    activeDot={{ r: 6 }}
  />
</LineChart>
```

**Styling Details:**
- Grid lines: Dashed, low opacity
- Axes: No lines, no tick lines, muted color
- Line: 2px stroke width, smooth curve
- Dots: 4px radius default, 6px active
- Tooltip: Matches popover styling

### Bar Chart Styling

**Configuration:**
```tsx
<BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
  <CartesianGrid strokeDasharray="3 3" className="text-border opacity-30" />
  <XAxis
    dataKey="category"
    className="text-muted-foreground"
    tick={{ fontSize: 11 }}
  />
  <YAxis
    className="text-muted-foreground"
    tick={{ fontSize: 11 }}
  />
  <Tooltip />
  <Bar
    dataKey="value"
    fill="hsl(var(--primary))"
    radius={[4, 4, 0, 0]}
  />
</BarChart>
```

**Styling Details:**
- Bars: Rounded top corners (4px radius)
- Bar width: `barSize={40}` max
- Colors: Use category colors or primary
- Spacing: `barCategoryGap="10%"`

### Pie/Donut Chart Styling

**Configuration:**
```tsx
<PieChart>
  <Pie
    data={data}
    cx="50%"
    cy="50%"
    labelLine={false}
    label={renderCustomLabel}
    outerRadius={80}
    innerRadius={50}  // For donut chart
    fill="hsl(var(--primary))"
    dataKey="value"
  >
    {data.map((entry, index) => (
      <Cell
        key={`cell-${index}`}
        fill={COLORS[index % COLORS.length]}
      />
    ))}
  </Pie>
  <Tooltip />
</PieChart>
```

**Styling Details:**
- Use category colors for segments
- Inner radius 60-70% of outer for donut
- Labels outside or inside based on space
- Legend below chart with color squares

### Area Chart Styling

**Configuration:**
```tsx
<AreaChart data={data}>
  <defs>
    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
    </linearGradient>
  </defs>
  <CartesianGrid strokeDasharray="3 3" className="text-border opacity-30" />
  <XAxis dataKey="date" className="text-muted-foreground" />
  <YAxis className="text-muted-foreground" />
  <Tooltip />
  <Area
    type="monotone"
    dataKey="value"
    stroke="hsl(var(--primary))"
    strokeWidth={2}
    fillOpacity={1}
    fill="url(#colorValue)"
  />
</AreaChart>
```

**Styling Details:**
- Gradient fill: 30% opacity top, 0% bottom
- Stroke: 2px width, solid color
- Smooth curve: `type="monotone"`
- Grid: Subtle, dashed

### Heatmap Calendar Styling

**Custom Component (not Recharts):**
```tsx
<div className="grid grid-cols-53 gap-1">
  {days.map(day => (
    <div
      key={day.date}
      className={cn(
        "w-3 h-3 rounded-sm transition-colors",
        getHeatmapColor(day.activity)
      )}
      title={`${day.date}: ${day.activity} activities`}
    />
  ))}
</div>
```

**Color Function:**
```tsx
function getHeatmapColor(activity: number) {
  if (activity === 0) return "bg-muted"
  if (activity <= 2) return "bg-blue-200 dark:bg-blue-900/40"
  if (activity <= 5) return "bg-blue-400 dark:bg-blue-700/60"
  if (activity <= 10) return "bg-blue-600 dark:bg-blue-500/80"
  return "bg-blue-800 dark:bg-blue-400"
}
```

---

## Responsive Breakpoints

### Breakpoint System

**Tailwind Breakpoints:**
```css
/* Mobile First (default) */
/* 0px to 639px */

/* sm: Small devices (tablets) */
@media (min-width: 640px) { }

/* md: Medium devices (laptops) */
@media (min-width: 768px) { }

/* lg: Large devices (desktops) */
@media (min-width: 1024px) { }

/* xl: Extra large devices (large desktops) */
@media (min-width: 1280px) { }

/* 2xl: 2X large devices (ultra-wide) */
@media (min-width: 1536px) { }
```

### Responsive Layout Patterns

**Quick Stats Grid:**
```tsx
// Mobile: 2 columns
// Tablet: 4 columns
// Desktop: 6 columns
className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3"
```

**Chart Grid:**
```tsx
// Mobile: 1 column (stacked)
// Tablet: 2 columns
// Desktop: 3 columns
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
```

**Hero Section:**
```tsx
// Mobile: Stack vertically
// Desktop: Side by side
className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
```

**Period Selector:**
```tsx
// Mobile: Compact buttons, icons only
// Desktop: Full text labels
<TabsTrigger value="week">
  <Calendar className="h-4 w-4" />
  <span className="hidden sm:inline">Week</span>
</TabsTrigger>
```

### Typography Responsiveness

**Heading Sizes:**
```tsx
// Page title
className="text-2xl sm:text-3xl lg:text-4xl font-bold"

// Section title
className="text-lg sm:text-xl lg:text-2xl font-semibold"

// Metric value
className="text-3xl sm:text-4xl lg:text-5xl font-bold"
```

### Spacing Responsiveness

**Section Spacing:**
```tsx
// Smaller gaps on mobile, larger on desktop
className="space-y-4 sm:space-y-6 lg:space-y-8"

// Grid gaps
className="gap-2 sm:gap-3 lg:gap-4"
```

### Chart Responsiveness

**Chart Heights:**
```tsx
// Mobile: Shorter charts
// Tablet: Medium height
// Desktop: Full height
className="h-[200px] sm:h-[300px] lg:h-[400px]"
```

**Chart Margins:**
```tsx
// Reduce margins on mobile
const chartMargin = {
  mobile: { top: 5, right: 5, bottom: 20, left: 5 },
  desktop: { top: 10, right: 20, bottom: 30, left: 20 },
}
```

### Mobile-Specific Optimizations

**Hide on Mobile:**
```tsx
// Hide detailed labels on mobile
className="hidden sm:block"

// Hide secondary charts
className="hidden lg:block"
```

**Mobile-Only:**
```tsx
// Show simplified version on mobile
className="sm:hidden"

// Mobile-specific layout
className="flex sm:hidden flex-col gap-2"
```

**Touch Targets:**
```tsx
// Ensure minimum 44x44px touch targets on mobile
className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
```

---

## Animation Guidelines

### Transition Timing

**Timing Functions:**
```css
/* Default - Smooth easing */
.transition-default {
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}

/* Bounce - For celebrations */
.transition-bounce {
  transition-timing-function: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  transition-duration: 300ms;
}

/* Elastic - For interactive elements */
.transition-elastic {
  transition-timing-function: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  transition-duration: 400ms;
}
```

### Common Animations

**Fade In:**
```tsx
// Enter animation
className="animate-in fade-in duration-300"

// Exit animation
className="animate-out fade-out duration-200"
```

**Slide In:**
```tsx
// Slide from bottom
className="animate-in slide-in-from-bottom-4 duration-300"

// Slide from right
className="animate-in slide-in-from-right-4 duration-300"
```

**Scale:**
```tsx
// Scale up on hover
className="hover:scale-105 transition-transform duration-200"

// Scale down on click
className="active:scale-95 transition-transform"
```

**Number Counter Animation:**
```tsx
// Use react-countup or similar
<CountUp
  end={value}
  duration={1}
  separator=","
  decimals={0}
/>
```

### Chart Animations

**Chart Entry Animation:**
```tsx
// Recharts built-in
<Line
  animationDuration={800}
  animationBegin={0}
  animationEasing="ease-out"
/>
```

**Tooltip Animation:**
```tsx
className="animate-in fade-in zoom-in-95 duration-150"
```

### Achievement Unlock Animation

**Celebration Animation:**
```tsx
// Modal with confetti
<Dialog>
  <DialogContent className="animate-in zoom-in-95 duration-300">
    {/* Confetti canvas overlay */}
    <div className="absolute inset-0 pointer-events-none">
      <Confetti recycle={false} numberOfPieces={200} />
    </div>

    {/* Achievement content */}
    <div className="animate-in slide-in-from-bottom-4 duration-500 delay-100">
      {/* Achievement details */}
    </div>
  </DialogContent>
</Dialog>
```

### Loading States

**Skeleton Loading:**
```tsx
<div className="space-y-3">
  <Skeleton className="h-20 w-full animate-pulse" />
  <Skeleton className="h-20 w-full animate-pulse delay-75" />
  <Skeleton className="h-20 w-full animate-pulse delay-150" />
</div>
```

**Spinner:**
```tsx
<div className="flex items-center justify-center p-8">
  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
</div>
```

**Progress Bar:**
```tsx
<div className="h-1 w-full bg-muted overflow-hidden">
  <div
    className="h-full bg-primary animate-pulse"
    style={{ width: `${progress}%` }}
  />
</div>
```

### Hover Animations

**Card Lift:**
```tsx
className="transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
```

**Icon Bounce:**
```tsx
className="transition-transform duration-200 hover:scale-110 active:scale-95"
```

**Glow Effect:**
```tsx
className="relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700"
```

### Performance Considerations

**Use `will-change` for animated elements:**
```tsx
className="will-change-transform"
```

**Reduce motion for accessibility:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Dark Mode Specifications

### Dark Mode Color Adjustments

**Background Layers:**
```css
/* Light Mode */
--background: oklch(1 0 0)           /* White */
--card: oklch(1 0 0)                 /* White */
--popover: oklch(1 0 0)              /* White */

/* Dark Mode */
--background: oklch(0 0 0)           /* Black */
--card: oklch(0.05 0 0)              /* Very Dark Gray */
--popover: oklch(0.05 0 0)           /* Very Dark Gray */
```

**Text Contrast:**
```css
/* Light Mode */
--foreground: oklch(0.145 0 0)       /* Near Black */
--muted-foreground: oklch(0.556 0 0) /* Medium Gray */

/* Dark Mode */
--foreground: oklch(0.985 0 0)       /* White */
--muted-foreground: oklch(0.708 0 0) /* Light Gray */
```

### Category Colors in Dark Mode

**Adjusted for Dark Background:**
```tsx
// Games - Purple (more vibrant in dark)
className="text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30"

// Books - Orange
className="text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30"

// TV Shows - Blue
className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30"

// Movies - Red
className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30"
```

### Chart Colors in Dark Mode

**Chart Palette Adjustments:**
```tsx
const chartColors = {
  light: {
    primary: 'hsl(var(--primary))',
    grid: 'hsl(var(--border))',
    text: 'hsl(var(--muted-foreground))',
  },
  dark: {
    primary: 'hsl(var(--primary))',
    grid: 'hsl(var(--border) / 0.3)',
    text: 'hsl(var(--muted-foreground))',
  }
}
```

### Shadow Adjustments

**Light Mode Shadows:**
```css
.shadow-sm { box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
.shadow-md { box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
.shadow-lg { box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); }
```

**Dark Mode Shadows:**
```css
.dark .shadow-sm { box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.3); }
.dark .shadow-md { box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.5); }
.dark .shadow-lg { box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.7); }
```

### Border Adjustments

**Light Mode:**
```css
--border: oklch(0.922 0 0)  /* Subtle gray border */
```

**Dark Mode:**
```css
--border: oklch(1 0 0 / 8%)  /* Very subtle white border */
```

### Heatmap in Dark Mode

**Light Mode Colors:**
```tsx
const lightHeatmap = {
  0: "bg-gray-100",
  1: "bg-blue-200",
  2: "bg-blue-400",
  3: "bg-blue-600",
  4: "bg-blue-800",
}
```

**Dark Mode Colors:**
```tsx
const darkHeatmap = {
  0: "bg-gray-900",
  1: "bg-blue-900/40",
  2: "bg-blue-700/60",
  3: "bg-blue-500/80",
  4: "bg-blue-400",
}
```

---

## Component Catalog

### Complete Component Reference

#### 1. StatsHero Component
```tsx
interface StatsHeroProps {
  currentStreak: number
  totalItems: number
  thisMonthActiveDays: number
  timeInvested: string
  period: 'week' | 'month' | 'year' | 'all'
  onPeriodChange: (period: string) => void
}
```

**Layout:** 2x3 grid on mobile, 1x6 on desktop
**Height:** Flexible based on content
**Spacing:** `gap-2 sm:gap-3`

#### 2. PeriodSelector Component
```tsx
interface PeriodSelectorProps {
  value: 'week' | 'month' | 'year' | 'all'
  onChange: (value: string) => void
}
```

**Width:** Auto-width inline-flex
**Height:** `h-9`
**Padding:** `p-1` container, `px-3` buttons

#### 3. StatCard Component
```tsx
interface StatCardProps {
  label: string
  value: string | number
  trend?: {
    direction: 'up' | 'down' | 'neutral'
    value: string
  }
  icon?: React.ReactNode
  variant?: 'default' | 'highlighted' | 'category'
  categoryColor?: CategoryColor
}
```

**Dimensions:** Flexible width, `min-h-[90px]`
**Padding:** `p-4`
**Border radius:** `rounded-xl`

#### 4. ChartCard Component
```tsx
interface ChartCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: string
  actions?: React.ReactNode
}
```

**Height:** `h-[300px] sm:h-[350px]` for chart area
**Padding:** Standard card padding
**Chart margins:** `{ top: 10, right: 10, bottom: 10, left: 10 }`

#### 5. ActivityHeatmap Component
```tsx
interface ActivityHeatmapProps {
  data: Array<{ date: string; activity: number }>
  startDate: Date
  endDate: Date
  currentStreak: number
}
```

**Width:** Full width with horizontal scroll
**Cell size:** `w-3 h-3` (12x12px)
**Gap:** `gap-1`
**Months:** Last 12 months

#### 6. AchievementBadge Component
```tsx
interface AchievementBadgeProps {
  title: string
  description: string
  icon: React.ReactNode
  unlocked: boolean
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
  progress?: number
  onClick?: () => void
}
```

**Badge size:** `h-14 w-14`
**Icon size:** `h-7 w-7`
**Padding:** `p-3`
**Hover:** Scale 1.05

#### 7. ComparisonCard Component
```tsx
interface ComparisonCardProps {
  label: string
  currentValue: number
  previousValue: number
  currentPeriod: string
  previousPeriod: string
}
```

**Width:** Flexible
**Height:** `min-h-[160px]`
**Spacing:** `space-y-4` between sections

#### 8. CategoryTab Component
```tsx
interface CategoryTabProps {
  categories: Array<{
    id: string
    label: string
    icon: React.ReactNode
  }>
  defaultValue: string
  children: React.ReactNode
}
```

**Tab height:** `h-9`
**List padding:** `p-1`
**Gap:** `gap-2`

#### 9. ProgressRing Component
```tsx
interface ProgressRingProps {
  progress: number
  size?: 'sm' | 'md' | 'lg'
  label?: string
  color?: string
}
```

**Sizes:**
- Small: `w-16 h-16`
- Medium: `w-24 h-24`
- Large: `w-32 h-32`

**Stroke width:** `8px`
**Animation:** 500ms ease-out

#### 10. Sparkline Component
```tsx
interface SparklineProps {
  data: Array<{ value: number }>
  color?: string
  height?: number
}
```

**Default height:** `h-8` (32px)
**Stroke width:** `1.5px`
**No axes or labels**

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Create `/app/statistics/page.tsx`
- [ ] Build PeriodSelector component
- [ ] Build StatCard component with variants
- [ ] Build page layout structure
- [ ] Implement basic stat calculations
- [ ] Add responsive grid layouts
- [ ] Test mobile responsiveness

### Phase 2: Visualizations
- [ ] Install Recharts library
- [ ] Build ChartCard wrapper component
- [ ] Implement Line chart for trends
- [ ] Implement Bar chart for comparisons
- [ ] Implement Pie chart for distributions
- [ ] Build custom ActivityHeatmap component
- [ ] Add chart tooltips and interactions
- [ ] Test chart responsiveness

### Phase 3: Achievements
- [ ] Design achievement data structure
- [ ] Build AchievementBadge component
- [ ] Implement achievement unlock logic
- [ ] Create celebration animations
- [ ] Build achievement progress tracking
- [ ] Add achievement filtering

### Phase 4: Polish
- [ ] Add loading states and skeletons
- [ ] Implement error boundaries
- [ ] Add dark mode optimizations
- [ ] Optimize chart performance
- [ ] Add data export functionality
- [ ] Implement comparison mode
- [ ] Test accessibility (keyboard, screen reader)
- [ ] Performance testing and optimization

---

## Accessibility Compliance

### WCAG AA Requirements

**Color Contrast:**
- Text on background: Minimum 4.5:1
- Large text: Minimum 3:1
- UI components: Minimum 3:1

**Keyboard Navigation:**
- All interactive elements focusable
- Logical tab order
- Visible focus indicators
- Keyboard shortcuts documented

**Screen Reader Support:**
- Semantic HTML structure
- ARIA labels for charts
- Alt text for achievement badges
- Live regions for dynamic updates

**Motion:**
- Respect `prefers-reduced-motion`
- Disable animations when requested
- Provide static alternatives

---

## Performance Targets

### Loading Performance
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3.5s

### Runtime Performance
- Chart render time: < 100ms
- Smooth 60fps animations
- Lazy load below-fold charts
- Virtualize long lists

### Bundle Size
- Component bundle: < 50kb gzipped
- Chart library: Lazy loaded
- Optimize images for achievements

---

## File Structure

```
/app/statistics/
  page.tsx                    # Main statistics page

/components/statistics/
  stats-hero.tsx              # Hero section with key metrics
  period-selector.tsx         # Time period toggle
  stat-card.tsx               # Reusable stat display card
  chart-card.tsx              # Card wrapper for charts
  activity-heatmap.tsx        # Calendar heatmap
  achievement-badge.tsx       # Achievement display
  achievement-grid.tsx        # Grid of achievements
  comparison-card.tsx         # Period comparison
  category-tabs.tsx           # Category switcher
  progress-ring.tsx           # Circular progress
  trend-indicator.tsx         # Up/down/neutral badge
  sparkline.tsx               # Mini line chart
  time-investment-chart.tsx   # Time breakdown chart
  category-deep-dive.tsx      # Category-specific stats

/lib/statistics/
  calculations.ts             # Stat calculation functions
  achievements.ts             # Achievement logic
  chart-config.ts             # Chart styling configs
  types.ts                    # TypeScript interfaces
```

---

## Design Handoff Notes

### For Developers

**Priority Order:**
1. Build basic layout and stat cards first
2. Add period selector functionality
3. Integrate chart library and create simple visualizations
4. Build achievement system
5. Add animations and polish

**Key Implementation Notes:**
- Use existing shadcn components where possible
- Follow established patterns from dashboard
- Maintain consistency with existing color system
- Test dark mode throughout development
- Prioritize mobile experience

**Data Requirements:**
- Historical data with timestamps
- Aggregated statistics per period
- Achievement definitions and progress
- Cross-category relationships

### For Designers

**Areas Requiring Additional Design:**
- Empty states (no data yet)
- Error states (data fetch failures)
- Loading states (skeleton screens)
- Achievement unlock modal design
- Export/share functionality
- Settings/preferences panel

---

**Document Version:** 1.0
**Last Updated:** November 3, 2025
**Next Review:** After Phase 1 implementation
**Feedback:** Iterate based on user testing and developer feasibility
