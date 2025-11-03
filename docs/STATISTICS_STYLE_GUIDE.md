# Statistics Page - Developer Style Guide

**Quick Reference for Implementation**
**Date:** November 3, 2025
**Version:** 1.0

---

## Quick Start

This is a condensed style guide for rapid implementation. For full details, see:
- `STATISTICS_UI_DESIGN_SPEC.md` - Complete design specifications
- `STATISTICS_VISUAL_MOCKUPS.md` - Visual layout descriptions
- `STATISTICS_UX_RESEARCH.md` - User requirements and research

---

## Color Palette - Copy & Paste

### Category Colors

```tsx
const CATEGORY_COLORS = {
  games: {
    text: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-200 dark:border-purple-900/30',
    hex: '#8B5CF6',
  },
  books: {
    text: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-200 dark:border-orange-900/30',
    hex: '#F59E0B',
  },
  tvshows: {
    text: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-900/30',
    hex: '#3B82F6',
  },
  movies: {
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-900/30',
    hex: '#EF4444',
  },
  phev: {
    text: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-900/30',
    hex: '#10B981',
  },
  inventory: {
    text: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-950/30',
    border: 'border-slate-200 dark:border-slate-900/30',
    hex: '#64748B',
  },
  jobs: {
    text: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/30',
    border: 'border-indigo-200 dark:border-indigo-900/30',
    hex: '#6366F1',
  },
}
```

### Trend Colors

```tsx
const TREND_COLORS = {
  positive: {
    text: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-900/30',
  },
  negative: {
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-900/30',
  },
  neutral: {
    text: 'text-muted-foreground',
    bg: 'bg-muted',
    border: 'border-border',
  },
}
```

### Heatmap Colors

```tsx
const HEATMAP_COLORS = {
  light: {
    level0: '#F3F4F6', // gray-100
    level1: '#DBEAFE', // blue-100
    level2: '#93C5FD', // blue-300
    level3: '#3B82F6', // blue-500
    level4: '#1E40AF', // blue-700
  },
  dark: {
    level0: '#1F2937', // gray-800
    level1: 'rgba(59, 130, 246, 0.3)',
    level2: 'rgba(59, 130, 246, 0.5)',
    level3: 'rgba(59, 130, 246, 0.7)',
    level4: '#3B82F6',
  },
}
```

---

## Typography - Copy & Paste

```tsx
const TYPOGRAPHY = {
  // Page title
  pageTitle: 'text-2xl sm:text-3xl font-bold tracking-tight',

  // Section title
  sectionTitle: 'text-lg sm:text-xl font-semibold',

  // Card title
  cardTitle: 'text-base sm:text-lg font-semibold',

  // Large metric value
  metricLarge: 'text-4xl sm:text-5xl font-bold',

  // Standard metric value
  metricStandard: 'text-2xl sm:text-3xl font-bold',

  // Small metric value
  metricSmall: 'text-xl font-semibold',

  // Label
  label: 'text-xs font-medium text-muted-foreground',

  // Description
  description: 'text-sm text-muted-foreground',

  // Caption
  caption: 'text-xs text-muted-foreground',

  // Tiny text (timestamps, etc)
  tiny: 'text-[10px] text-muted-foreground',
}
```

---

## Spacing - Copy & Paste

```tsx
const SPACING = {
  // Page-level spacing
  pageContainer: 'space-y-4 sm:space-y-6',

  // Section spacing
  sectionContainer: 'space-y-3 sm:space-y-4',

  // Card padding
  cardPadding: 'p-6',
  cardPaddingCompact: 'p-4',
  cardHeaderPadding: 'pb-3',

  // Grid gaps
  gridGapTight: 'gap-2',
  gridGapDefault: 'gap-3 sm:gap-4',
  gridGapLoose: 'gap-4 sm:gap-6',
}
```

---

## Grid Layouts - Copy & Paste

```tsx
const GRID_LAYOUTS = {
  // Quick stats (6 columns max)
  quickStats: 'grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6',

  // Charts (3 columns max)
  charts: 'grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3',

  // Achievements (8 columns max)
  achievements: 'grid gap-2 grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8',

  // Comparisons (4 columns max)
  comparisons: 'grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',

  // Full width
  fullWidth: 'col-span-full',
}
```

---

## Component Templates

### 1. Stat Card

```tsx
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  trend?: {
    direction: 'up' | 'down' | 'neutral'
    value: string
  }
  icon?: React.ReactNode
}

export function StatCard({ label, value, trend, icon }: StatCardProps) {
  const trendIcon =
    trend?.direction === 'up' ? <TrendingUp className="w-3 h-3" /> :
    trend?.direction === 'down' ? <TrendingDown className="w-3 h-3" /> :
    <Minus className="w-3 h-3" />

  const trendColor =
    trend?.direction === 'up' ? 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/30 dark:border-green-900/30' :
    trend?.direction === 'down' ? 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-900/30' :
    'text-muted-foreground'

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardDescription className="text-xs font-medium">
            {label}
          </CardDescription>
          {trend && (
            <Badge variant="outline" className={`text-[10px] h-5 gap-0.5 ${trendColor}`}>
              {trendIcon}
              {trend.value}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {icon && <div className="text-muted-foreground">{icon}</div>}
          <CardTitle className="text-2xl font-bold">{value}</CardTitle>
        </div>
      </CardHeader>
    </Card>
  )
}

// Usage:
<StatCard
  label="Total Games"
  value={48}
  trend={{ direction: 'up', value: '+12%' }}
/>
```

---

### 2. Period Selector

```tsx
import { Button } from '@/components/ui/button'

type Period = 'week' | 'month' | 'year' | 'all'

interface PeriodSelectorProps {
  value: Period
  onChange: (value: Period) => void
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const periods: { value: Period; label: string }[] = [
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' },
    { value: 'all', label: 'All Time' },
  ]

  return (
    <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-lg">
      {periods.map((period) => (
        <Button
          key={period.value}
          variant={value === period.value ? 'default' : 'ghost'}
          size="sm"
          className="h-8 px-3"
          onClick={() => onChange(period.value)}
        >
          {period.label}
        </Button>
      ))}
    </div>
  )
}

// Usage:
const [period, setPeriod] = useState<Period>('month')
<PeriodSelector value={period} onChange={setPeriod} />
```

---

### 3. Chart Card

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MoreVertical } from 'lucide-react'

interface ChartCardProps {
  title: string
  subtitle?: string
  footer?: string
  actions?: React.ReactNode
  children: React.ReactNode
}

export function ChartCard({ title, subtitle, footer, actions, children }: ChartCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            {subtitle && (
              <CardDescription className="text-xs">{subtitle}</CardDescription>
            )}
          </div>
          {actions || (
            <Button variant="ghost" size="icon-sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] sm:h-[350px]">{children}</div>
      </CardContent>
      {footer && (
        <CardFooter className="pt-0">
          <p className="text-xs text-muted-foreground">{footer}</p>
        </CardFooter>
      )}
    </Card>
  )
}

// Usage:
<ChartCard
  title="Time Investment"
  subtitle="Hours per category this month"
  footer="Total: 295 hours"
>
  {/* Chart component */}
</ChartCard>
```

---

### 4. Achievement Badge

```tsx
import { cn } from '@/lib/utils'
import { Check, Lock } from 'lucide-react'

type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'

interface AchievementBadgeProps {
  title: string
  description: string
  icon: React.ReactNode
  unlocked: boolean
  tier?: AchievementTier
  onClick?: () => void
}

const TIER_GRADIENTS = {
  bronze: 'from-[#CD7F32] to-[#A0522D]',
  silver: 'from-[#C0C0C0] to-[#A9A9A9]',
  gold: 'from-[#FFD700] to-[#FFA500]',
  platinum: 'from-[#E5E4E2] to-[#B9D9EB]',
  diamond: 'from-[#B9F2FF] to-[#4FC3F7]',
}

export function AchievementBadge({
  title,
  description,
  icon,
  unlocked,
  tier = 'gold',
  onClick,
}: AchievementBadgeProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 p-3 rounded-lg transition-all cursor-pointer',
        unlocked ? 'hover:bg-accent' : 'opacity-40'
      )}
      onClick={onClick}
    >
      <div className="relative">
        <div
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full shadow-lg',
            unlocked
              ? `bg-gradient-to-br ${TIER_GRADIENTS[tier]}`
              : 'bg-muted'
          )}
        >
          {unlocked ? (
            <div className="text-white">{icon}</div>
          ) : (
            <Lock className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        {unlocked && (
          <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 border-2 border-background">
            <Check className="h-3 w-3 text-white" />
          </div>
        )}
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold">{title}</p>
        <p className="text-[10px] text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

// Usage:
<AchievementBadge
  title="Century Club"
  description="100 items tracked"
  icon={<Trophy className="h-7 w-7" />}
  unlocked={true}
  tier="gold"
/>
```

---

### 5. Comparison Card

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface ComparisonCardProps {
  label: string
  currentValue: number
  previousValue: number
  currentPeriod: string
  previousPeriod: string
  unit?: string
}

export function ComparisonCard({
  label,
  currentValue,
  previousValue,
  currentPeriod,
  previousPeriod,
  unit = '',
}: ComparisonCardProps) {
  const percentChange = previousValue > 0
    ? ((currentValue - previousValue) / previousValue) * 100
    : 0

  const trend =
    percentChange > 0 ? 'up' :
    percentChange < 0 ? 'down' :
    'neutral'

  const trendIcon =
    trend === 'up' ? <TrendingUp className="w-3 h-3" /> :
    trend === 'down' ? <TrendingDown className="w-3 h-3" /> :
    <Minus className="w-3 h-3" />

  const trendColor =
    trend === 'up' ? 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/30' :
    trend === 'down' ? 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30' :
    'text-muted-foreground'

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{currentPeriod}</p>
            <p className="text-3xl font-bold">
              {currentValue.toLocaleString()}{unit}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <Badge variant="outline" className={`text-xs ${trendColor}`}>
              {trendIcon}
              {percentChange > 0 ? '+' : ''}
              {percentChange.toFixed(0)}%
            </Badge>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">{previousPeriod}</p>
            <p className="text-2xl font-semibold text-muted-foreground">
              {previousValue.toLocaleString()}{unit}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Usage:
<ComparisonCard
  label="Games Played"
  currentValue={24}
  previousValue={18}
  currentPeriod="This Month"
  previousPeriod="Last Month"
/>
```

---

### 6. Activity Heatmap

```tsx
import { cn } from '@/lib/utils'

interface HeatmapDay {
  date: string
  activity: number
}

interface ActivityHeatmapProps {
  data: HeatmapDay[]
}

function getHeatmapColor(activity: number, isDark: boolean) {
  if (activity === 0) return isDark ? 'bg-gray-900' : 'bg-gray-100'
  if (activity <= 2) return isDark ? 'bg-blue-900/40' : 'bg-blue-200'
  if (activity <= 5) return isDark ? 'bg-blue-700/60' : 'bg-blue-400'
  if (activity <= 10) return isDark ? 'bg-blue-500/80' : 'bg-blue-600'
  return isDark ? 'bg-blue-400' : 'bg-blue-800'
}

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const [isDark, setIsDark] = React.useState(false)

  React.useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  return (
    <div className="overflow-x-auto">
      <div className="inline-grid grid-flow-col auto-cols-max gap-1">
        {data.map((day) => (
          <div
            key={day.date}
            className={cn(
              'w-3 h-3 rounded-sm transition-colors hover:scale-125 hover:z-10',
              getHeatmapColor(day.activity, isDark)
            )}
            title={`${day.date}: ${day.activity} activities`}
          />
        ))}
      </div>
    </div>
  )
}

// Usage:
<ActivityHeatmap
  data={[
    { date: '2025-01-01', activity: 3 },
    { date: '2025-01-02', activity: 5 },
    // ... more days
  ]}
/>
```

---

## Chart Configurations

### Recharts Line Chart

```tsx
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const CHART_CONFIG = {
  margin: { top: 10, right: 10, bottom: 10, left: 10 },
  cartesianGrid: {
    strokeDasharray: '3 3',
    className: 'text-border opacity-50',
  },
  xAxis: {
    className: 'text-muted-foreground text-xs',
    tick: { fontSize: 11 },
    tickLine: false,
  },
  yAxis: {
    className: 'text-muted-foreground text-xs',
    tick: { fontSize: 11 },
    tickLine: false,
    axisLine: false,
  },
  line: {
    type: 'monotone',
    strokeWidth: 2,
    dot: { fill: 'hsl(var(--primary))', r: 4 },
    activeDot: { r: 6 },
  },
}

// Usage:
<ResponsiveContainer width="100%" height="100%">
  <LineChart data={data} {...CHART_CONFIG}>
    <CartesianGrid {...CHART_CONFIG.cartesianGrid} />
    <XAxis dataKey="month" {...CHART_CONFIG.xAxis} />
    <YAxis {...CHART_CONFIG.yAxis} />
    <Tooltip />
    <Line
      dataKey="value"
      stroke="hsl(var(--primary))"
      {...CHART_CONFIG.line}
    />
  </LineChart>
</ResponsiveContainer>
```

---

### Recharts Bar Chart

```tsx
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const BAR_CHART_CONFIG = {
  margin: { top: 5, right: 5, bottom: 5, left: 5 },
  barSize: 40,
  barCategoryGap: '10%',
  bar: {
    radius: [4, 4, 0, 0],
  },
}

// Usage:
<ResponsiveContainer width="100%" height="100%">
  <BarChart data={data} {...BAR_CHART_CONFIG}>
    <CartesianGrid strokeDasharray="3 3" className="text-border opacity-30" />
    <XAxis dataKey="category" className="text-muted-foreground text-xs" />
    <YAxis className="text-muted-foreground text-xs" />
    <Tooltip />
    <Bar
      dataKey="value"
      fill="hsl(var(--primary))"
      {...BAR_CHART_CONFIG.bar}
    />
  </BarChart>
</ResponsiveContainer>
```

---

### Custom Tooltip

```tsx
interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
}

export function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="bg-popover text-popover-foreground border border-border rounded-lg p-3 shadow-lg">
      <p className="text-sm font-semibold mb-1">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-xs">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

// Usage in chart:
<Tooltip content={<CustomTooltip />} />
```

---

## Animation Utilities

### Number Counter

```tsx
import CountUp from 'react-countup'

interface AnimatedNumberProps {
  value: number
  decimals?: number
  duration?: number
  suffix?: string
}

export function AnimatedNumber({
  value,
  decimals = 0,
  duration = 1.2,
  suffix = '',
}: AnimatedNumberProps) {
  return (
    <CountUp
      end={value}
      duration={duration}
      decimals={decimals}
      separator=","
      suffix={suffix}
      useEasing={true}
    />
  )
}

// Usage:
<AnimatedNumber value={12750} decimals={0} />
```

---

### Loading Skeleton

```tsx
import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted',
        className
      )}
    />
  )
}

// Usage for stat cards:
<div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
  {[...Array(6)].map((_, i) => (
    <Skeleton key={i} className="h-24" />
  ))}
</div>
```

---

## Responsive Utilities

### Responsive Grid Generator

```tsx
interface ResponsiveGridProps {
  children: React.ReactNode
  cols?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
  gap?: 'tight' | 'default' | 'loose'
}

export function ResponsiveGrid({
  children,
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'default',
}: ResponsiveGridProps) {
  const gapClass =
    gap === 'tight' ? 'gap-2' :
    gap === 'loose' ? 'gap-4 sm:gap-6' :
    'gap-3 sm:gap-4'

  return (
    <div
      className={cn(
        'grid',
        gapClass,
        `grid-cols-${cols.mobile}`,
        cols.tablet && `md:grid-cols-${cols.tablet}`,
        cols.desktop && `lg:grid-cols-${cols.desktop}`
      )}
    >
      {children}
    </div>
  )
}

// Usage:
<ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 4 }}>
  <StatCard label="..." value="..." />
  <StatCard label="..." value="..." />
  {/* ... */}
</ResponsiveGrid>
```

---

## Accessibility Helpers

### Screen Reader Only Text

```tsx
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return (
    <span className="sr-only">
      {children}
    </span>
  )
}

// Usage:
<div aria-labelledby="stat-title">
  <VisuallyHidden>
    <h3 id="stat-title">Total Games Tracked</h3>
  </VisuallyHidden>
  <p aria-label="48 games, up 12% from last month">
    48
  </p>
</div>
```

---

### Keyboard Navigation Hook

```tsx
import { useEffect } from 'react'

export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    function handleKeyPress(event: KeyboardEvent) {
      const key = event.key.toLowerCase()
      if (shortcuts[key]) {
        event.preventDefault()
        shortcuts[key]()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [shortcuts])
}

// Usage:
useKeyboardShortcuts({
  w: () => setPeriod('week'),
  m: () => setPeriod('month'),
  y: () => setPeriod('year'),
  a: () => setPeriod('all'),
})
```

---

## Performance Optimizations

### Lazy Load Chart

```tsx
import dynamic from 'next/dynamic'

const LineChart = dynamic(
  () => import('@/components/statistics/line-chart'),
  {
    loading: () => <Skeleton className="h-[300px]" />,
    ssr: false,
  }
)

// Usage:
<ChartCard title="Time Investment">
  <LineChart data={data} />
</ChartCard>
```

---

### Virtualized Achievement Grid

```tsx
import { useVirtualizer } from '@tanstack/react-virtual'

export function VirtualizedAchievementGrid({
  achievements,
}: {
  achievements: Achievement[]
}) {
  const parentRef = React.useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(achievements.length / 8),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
  })

  return (
    <div ref={parentRef} className="h-[400px] overflow-auto">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * 8
          const rowAchievements = achievements.slice(startIndex, startIndex + 8)

          return (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="grid grid-cols-8 gap-2">
                {rowAchievements.map((achievement) => (
                  <AchievementBadge key={achievement.id} {...achievement} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

---

## Testing Utilities

### Mock Data Generator

```tsx
export function generateMockStatData() {
  return {
    currentStreak: 127,
    totalGames: 48,
    totalBooks: 32,
    totalTVShows: 15,
    totalMovies: 24,
    thisMonthHours: 295,
    activeDays: 22,
    completionRate: 68,
    weekOverWeekChange: 24,
  }
}

export function generateMockTimelineData(months: number = 6) {
  return Array.from({ length: months }, (_, i) => ({
    month: new Date(2025, i, 1).toLocaleDateString('en', { month: 'short' }),
    games: Math.floor(Math.random() * 150) + 50,
    books: Math.floor(Math.random() * 100) + 30,
    tvshows: Math.floor(Math.random() * 80) + 20,
    movies: Math.floor(Math.random() * 50) + 10,
  }))
}

export function generateMockHeatmapData(days: number = 365) {
  const today = new Date()
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    return {
      date: date.toISOString().split('T')[0],
      activity: Math.floor(Math.random() * 12),
    }
  })
}
```

---

## Common Patterns

### Page Layout Structure

```tsx
export default function StatisticsPage() {
  const [period, setPeriod] = useState<Period>('month')

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Statistics
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Your tracking insights and achievements
          </p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Quick Stats */}
      <div className="grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
        {/* Stat cards */}
      </div>

      {/* Activity Heatmap */}
      <Card className="col-span-full">
        {/* Heatmap content */}
      </Card>

      {/* Charts */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Chart cards */}
      </div>

      {/* Category Tabs */}
      <Tabs defaultValue="games">
        {/* Tab content */}
      </Tabs>

      {/* Achievements */}
      <Card>
        <div className="grid gap-2 grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
          {/* Achievement badges */}
        </div>
      </Card>

      {/* Comparisons */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Comparison cards */}
      </div>
    </div>
  )
}
```

---

## Quick Tips

### Do's
- Use existing shadcn components whenever possible
- Follow the established grid patterns
- Maintain consistent spacing with utility classes
- Test dark mode for every component
- Use semantic HTML (h1, h2, article, section)
- Add ARIA labels for interactive elements
- Test keyboard navigation
- Optimize chart render performance

### Don'ts
- Don't create custom components when shadcn has them
- Don't use absolute positioning unless necessary
- Don't hardcode colors - use CSS variables
- Don't forget mobile responsiveness
- Don't rely on color alone for meaning
- Don't forget loading and error states
- Don't skip accessibility testing

---

## File Organization

```
/app/statistics/
  page.tsx                    # Main page

/components/statistics/
  stats-hero.tsx
  period-selector.tsx
  stat-card.tsx
  chart-card.tsx
  activity-heatmap.tsx
  achievement-badge.tsx
  comparison-card.tsx
  category-tabs.tsx

/lib/statistics/
  calculations.ts             # Stat calculations
  mock-data.ts               # Test data generators
  utils.ts                   # Helper functions
  types.ts                   # TypeScript types
```

---

## Quick Commands

```bash
# Install chart library
npm install recharts

# Install animation library
npm install react-countup

# Install virtualization (if needed for large lists)
npm install @tanstack/react-virtual

# Install confetti (for achievements)
npm install react-confetti

# Run dev server
npm run dev
```

---

**Document Version:** 1.0
**Last Updated:** November 3, 2025
**For Questions:** Refer to full design spec documents
