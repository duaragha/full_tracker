# Statistics Dashboard - Component Examples

**Code examples and implementation patterns for statistics components**

---

## 1. StatCard Component

### Basic Implementation

```typescript
// components/statistics/stat-card.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUp, ArrowDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface TrendData {
  value: number
  direction: 'up' | 'down' | 'neutral'
  label?: string
}

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  trend?: TrendData
  icon?: React.ReactNode
  color?: string
  className?: string
}

export function StatCard({
  title,
  value,
  description,
  trend,
  icon,
  color = "primary",
  className
}: StatCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null
    switch (trend.direction) {
      case 'up': return <ArrowUp className="w-4 h-4" />
      case 'down': return <ArrowDown className="w-4 h-4" />
      case 'neutral': return <Minus className="w-4 h-4" />
    }
  }

  const getTrendColor = () => {
    if (!trend) return 'text-muted-foreground'
    switch (trend.direction) {
      case 'up': return 'text-green-600'
      case 'down': return 'text-red-600'
      case 'neutral': return 'text-gray-600'
    }
  }

  return (
    <Card className={cn("hover:shadow-md transition-shadow cursor-pointer", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <CardDescription className="text-xs mt-1">{description}</CardDescription>
        )}
        {trend && (
          <div className={cn("flex items-center gap-1 text-xs mt-2", getTrendColor())}>
            {getTrendIcon()}
            <span>{trend.value > 0 ? '+' : ''}{trend.value}%</span>
            {trend.label && <span className="text-muted-foreground">vs {trend.label}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

### Usage Example

```typescript
<StatCard
  title="Current Streak"
  value={15}
  description="days"
  trend={{ value: 13, direction: 'up', label: 'last month' }}
  icon={<Flame className="w-5 h-5 text-orange-500" />}
/>

<StatCard
  title="Total Gaming Time"
  value="45.5h"
  description="this month"
  trend={{ value: 19, direction: 'up', label: 'last month' }}
  icon={<Clock className="w-5 h-5 text-purple-500" />}
/>
```

---

## 2. PeriodSelector Component

```typescript
// components/statistics/period-selector.tsx
"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type TimePeriod = 'week' | 'month' | 'quarter' | 'year' | 'all'

interface PeriodSelectorProps {
  selected: TimePeriod
  onChange: (period: TimePeriod) => void
  className?: string
}

export function PeriodSelector({ selected, onChange, className }: PeriodSelectorProps) {
  const periods: { value: TimePeriod; label: string }[] = [
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'quarter', label: 'Quarter' },
    { value: 'year', label: 'Year' },
    { value: 'all', label: 'All Time' }
  ]

  return (
    <div className={cn("flex gap-1 p-1 bg-muted rounded-lg", className)}>
      {periods.map((period) => (
        <Button
          key={period.value}
          variant={selected === period.value ? "default" : "ghost"}
          size="sm"
          onClick={() => onChange(period.value)}
          className="transition-all"
        >
          {period.label}
        </Button>
      ))}
    </div>
  )
}
```

### Usage

```typescript
const [period, setPeriod] = useState<TimePeriod>('month')

<PeriodSelector
  selected={period}
  onChange={setPeriod}
  className="sticky top-4 z-10"
/>
```

---

## 3. TimeInvestmentChart Component

```typescript
// components/statistics/time-investment-chart.tsx
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

interface CategoryTime {
  category: string
  hours: number
  color: string
}

interface TimeInvestmentChartProps {
  data: CategoryTime[]
  title?: string
  description?: string
}

export function TimeInvestmentChart({
  data,
  title = "Time Investment by Category",
  description = "Hours spent this month"
}: TimeInvestmentChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              formatter={(value: number) => `${value.toFixed(1)}h`}
              contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
            />
            <Bar dataKey="hours" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

### Usage

```typescript
const categoryData = [
  { category: 'Games', hours: 45.5, color: '#8B5CF6' },
  { category: 'Books', hours: 12.3, color: '#F59E0B' },
  { category: 'TV Shows', hours: 28.7, color: '#3B82F6' },
  { category: 'Movies', hours: 8.5, color: '#EF4444' }
]

<TimeInvestmentChart data={categoryData} />
```

---

## 4. ActivityHeatmap Component

```typescript
// components/statistics/activity-heatmap.tsx
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import CalendarHeatmap from 'react-calendar-heatmap'
import 'react-calendar-heatmap/dist/styles.css'
import { Tooltip } from '@/components/ui/tooltip'

interface ActivityDay {
  date: string // YYYY-MM-DD format
  count: number
}

interface ActivityHeatmapProps {
  data: ActivityDay[]
  startDate: Date
  endDate: Date
  title?: string
}

export function ActivityHeatmap({
  data,
  startDate,
  endDate,
  title = "Activity Heatmap"
}: ActivityHeatmapProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Daily tracking activity</CardDescription>
      </CardHeader>
      <CardContent>
        <CalendarHeatmap
          startDate={startDate}
          endDate={endDate}
          values={data}
          classForValue={(value) => {
            if (!value) return 'color-empty'
            if (value.count === 0) return 'color-scale-0'
            if (value.count <= 2) return 'color-scale-1'
            if (value.count <= 5) return 'color-scale-2'
            if (value.count <= 10) return 'color-scale-3'
            return 'color-scale-4'
          }}
          tooltipDataAttrs={(value: ActivityDay) => ({
            'data-tip': value.date
              ? `${value.count} activities on ${value.date}`
              : 'No activity'
          })}
          showWeekdayLabels
        />
      </CardContent>
    </Card>
  )
}
```

### CSS Styles (add to globals.css)

```css
/* Activity Heatmap Colors */
.react-calendar-heatmap .color-empty {
  fill: #f3f4f6;
}
.react-calendar-heatmap .color-scale-0 {
  fill: #f3f4f6;
}
.react-calendar-heatmap .color-scale-1 {
  fill: #dbeafe;
}
.react-calendar-heatmap .color-scale-2 {
  fill: #93c5fd;
}
.react-calendar-heatmap .color-scale-3 {
  fill: #3b82f6;
}
.react-calendar-heatmap .color-scale-4 {
  fill: #1e40af;
}
.react-calendar-heatmap rect:hover {
  stroke: #000;
  stroke-width: 1px;
}
```

---

## 5. ComparisonCard Component

```typescript
// components/statistics/comparison-card.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface PeriodData {
  label: string
  value: number
  unit: string
  metadata?: { label: string; value: string | number }[]
}

interface ComparisonCardProps {
  title: string
  current: PeriodData
  previous: PeriodData
  className?: string
}

export function ComparisonCard({ title, current, previous, className }: ComparisonCardProps) {
  const difference = current.value - previous.value
  const percentChange = previous.value !== 0
    ? ((difference / previous.value) * 100).toFixed(1)
    : '0'
  const isPositive = difference > 0
  const isNeutral = difference === 0

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Current Period */}
          <div>
            <div className="text-sm text-muted-foreground mb-1">{current.label}</div>
            <div className="text-2xl font-bold">
              {current.value}{current.unit}
            </div>
            {current.metadata && (
              <div className="mt-2 space-y-1">
                {current.metadata.map((meta, idx) => (
                  <div key={idx} className="text-xs text-muted-foreground">
                    {meta.label}: {meta.value}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Previous Period */}
          <div>
            <div className="text-sm text-muted-foreground mb-1">{previous.label}</div>
            <div className="text-2xl font-bold text-muted-foreground/70">
              {previous.value}{previous.unit}
            </div>
            {previous.metadata && (
              <div className="mt-2 space-y-1">
                {previous.metadata.map((meta, idx) => (
                  <div key={idx} className="text-xs text-muted-foreground/70">
                    {meta.label}: {meta.value}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Change Indicator */}
        <div className={cn(
          "mt-4 pt-4 border-t flex items-center gap-2 text-sm font-medium",
          isNeutral ? "text-gray-600" : isPositive ? "text-green-600" : "text-red-600"
        )}>
          {!isNeutral && (
            isPositive
              ? <ArrowUp className="w-4 h-4" />
              : <ArrowDown className="w-4 h-4" />
          )}
          <span>
            {isPositive ? '+' : ''}{difference.toFixed(1)}{current.unit} ({percentChange}%)
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
```

### Usage

```typescript
<ComparisonCard
  title="Gaming Time"
  current={{
    label: "This Month",
    value: 45.5,
    unit: "h",
    metadata: [
      { label: "Games Played", value: 8 },
      { label: "Completed", value: 2 }
    ]
  }}
  previous={{
    label: "Last Month",
    value: 38.2,
    unit: "h",
    metadata: [
      { label: "Games Played", value: 6 },
      { label: "Completed", value: 1 }
    ]
  }}
/>
```

---

## 6. AchievementBadge Component

```typescript
// components/statistics/achievement-badge.tsx
import { Badge } from "@/components/ui/badge"
import { Lock, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface Achievement {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  unlocked: boolean
  unlockedDate?: Date
  progress?: number // 0-100 for locked achievements
  color?: string
}

interface AchievementBadgeProps {
  achievement: Achievement
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
}

export function AchievementBadge({
  achievement,
  size = 'md',
  onClick
}: AchievementBadgeProps) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-24 h-24'
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={onClick}
            className={cn(
              "relative flex flex-col items-center justify-center rounded-lg border-2 transition-all cursor-pointer",
              sizeClasses[size],
              achievement.unlocked
                ? "bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-400 hover:scale-105"
                : "bg-gray-100 border-gray-300 opacity-60 hover:opacity-80"
            )}
          >
            {/* Icon */}
            <div className={cn(
              "text-2xl",
              achievement.unlocked ? "text-yellow-600" : "text-gray-400"
            )}>
              {achievement.unlocked ? achievement.icon : <Lock className="w-6 h-6" />}
            </div>

            {/* Progress bar for locked achievements */}
            {!achievement.unlocked && achievement.progress !== undefined && (
              <div className="absolute bottom-1 left-2 right-2 h-1 bg-gray-300 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${achievement.progress}%` }}
                />
              </div>
            )}

            {/* Trophy indicator for unlocked */}
            {achievement.unlocked && (
              <Trophy className="absolute -top-1 -right-1 w-4 h-4 text-yellow-600" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <div className="font-semibold">{achievement.title}</div>
            <div className="text-sm text-muted-foreground">{achievement.description}</div>
            {achievement.unlocked && achievement.unlockedDate && (
              <div className="text-xs text-muted-foreground">
                Unlocked: {achievement.unlockedDate.toLocaleDateString()}
              </div>
            )}
            {!achievement.unlocked && achievement.progress !== undefined && (
              <div className="text-xs text-blue-600">
                Progress: {achievement.progress}%
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
```

### Usage

```typescript
const achievements = [
  {
    id: '1',
    title: 'Week Warrior',
    description: 'Track for 7 consecutive days',
    icon: <Flame className="w-6 h-6" />,
    unlocked: true,
    unlockedDate: new Date('2025-10-15')
  },
  {
    id: '2',
    title: 'Completionist',
    description: 'Finish 10 games at 100%',
    icon: <Trophy className="w-6 h-6" />,
    unlocked: false,
    progress: 60
  }
]

<div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
  {achievements.map(achievement => (
    <AchievementBadge
      key={achievement.id}
      achievement={achievement}
      onClick={() => showAchievementDetail(achievement)}
    />
  ))}
</div>
```

---

## 7. StreakDisplay Component

```typescript
// components/statistics/streak-display.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Flame, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface StreakDisplayProps {
  currentStreak: number
  longestStreak: number
  unit?: string
  className?: string
}

export function StreakDisplay({
  currentStreak,
  longestStreak,
  unit = 'days',
  className
}: StreakDisplayProps) {
  const isPersonalBest = currentStreak >= longestStreak
  const difference = longestStreak - currentStreak

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {/* Gradient background for active streak */}
      {currentStreak > 0 && (
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-red-50 opacity-50" />
      )}

      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-2">
          <Flame className={cn(
            "w-6 h-6",
            currentStreak > 0 ? "text-orange-500" : "text-gray-400"
          )} />
          Current Streak
        </CardTitle>
      </CardHeader>

      <CardContent className="relative">
        <div className="text-5xl font-bold mb-2">
          {currentStreak}
          <span className="text-2xl text-muted-foreground ml-2">{unit}</span>
        </div>

        {isPersonalBest && currentStreak > 0 ? (
          <div className="flex items-center gap-1 text-green-600 font-medium">
            <TrendingUp className="w-4 h-4" />
            <span>Personal Best! 🎉</span>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            {difference === 0
              ? "Start tracking to build a streak"
              : `${difference} ${unit} from personal best`
            }
          </div>
        )}

        {longestStreak > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground">Longest Streak</div>
            <div className="text-2xl font-bold">
              {longestStreak} <span className="text-base text-muted-foreground">{unit}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

---

## 8. TrendLine Component

```typescript
// components/statistics/trend-line.tsx
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

interface TrendDataPoint {
  label: string
  value: number
  [key: string]: any // Additional data points
}

interface TrendLineProps {
  data: TrendDataPoint[]
  title: string
  description?: string
  dataKey: string
  color?: string
  height?: number
}

export function TrendLine({
  data,
  title,
  description,
  dataKey,
  color = "#8B5CF6",
  height = 300
}: TrendLineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '6px'
              }}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

---

## 9. Main Statistics Page Structure

```typescript
// app/statistics/page.tsx
"use client"

import * as React from "react"
import { StatCard } from "@/components/statistics/stat-card"
import { PeriodSelector, TimePeriod } from "@/components/statistics/period-selector"
import { TimeInvestmentChart } from "@/components/statistics/time-investment-chart"
import { ActivityHeatmap } from "@/components/statistics/activity-heatmap"
import { ComparisonCard } from "@/components/statistics/comparison-card"
import { StreakDisplay } from "@/components/statistics/streak-display"
import { AchievementBadge } from "@/components/statistics/achievement-badge"
import { Clock, Flame, Trophy, TrendingUp } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function StatisticsPage() {
  const [period, setPeriod] = React.useState<TimePeriod>('month')
  const [loading, setLoading] = React.useState(true)

  // Fetch data based on period
  React.useEffect(() => {
    async function fetchStats() {
      setLoading(true)
      // TODO: Fetch statistics based on period
      // await getStatisticsAction(period)
      setLoading(false)
    }
    fetchStats()
  }, [period])

  if (loading) {
    return <StatisticsPageSkeleton />
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Statistics</h1>
          <p className="text-muted-foreground">Track your progress and achievements</p>
        </div>
        <PeriodSelector selected={period} onChange={setPeriod} />
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StreakDisplay currentStreak={15} longestStreak={23} />
        <StatCard
          title="Total Time"
          value="94.0h"
          description="this month"
          trend={{ value: 2, direction: 'up', label: 'last month' }}
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          title="Completed"
          value={12}
          description="items finished"
          trend={{ value: 20, direction: 'up', label: 'last month' }}
          icon={<Trophy className="w-5 h-5" />}
        />
        <StatCard
          title="Activity Score"
          value={892}
          description="all categories"
          trend={{ value: 12, direction: 'up', label: 'last month' }}
          icon={<TrendingUp className="w-5 h-5" />}
        />
      </div>

      {/* Time Investment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TimeInvestmentChart
          data={[
            { category: 'Games', hours: 45.5, color: '#8B5CF6' },
            { category: 'Books', hours: 12.3, color: '#F59E0B' },
            { category: 'TV Shows', hours: 28.7, color: '#3B82F6' },
            { category: 'Movies', hours: 8.5, color: '#EF4444' }
          ]}
        />
        <ActivityHeatmap
          data={[]} // TODO: Fetch activity data
          startDate={new Date(new Date().setMonth(new Date().getMonth() - 6))}
          endDate={new Date()}
        />
      </div>

      {/* Category Deep Dives */}
      <Tabs defaultValue="games" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
          <TabsTrigger value="games">Games</TabsTrigger>
          <TabsTrigger value="books">Books</TabsTrigger>
          <TabsTrigger value="tv">TV Shows</TabsTrigger>
          <TabsTrigger value="movies">Movies</TabsTrigger>
          <TabsTrigger value="phev">PHEV</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="games" className="space-y-4">
          {/* Games-specific statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title="Total Hours" value="523h" description="all-time" />
            <StatCard title="Completion Rate" value="34%" description="games at 100%" />
            <StatCard title="Active Games" value={12} description="currently playing" />
          </div>
          {/* Add more games-specific charts and stats */}
        </TabsContent>

        {/* More tab contents for other categories */}
      </Tabs>

      {/* Achievements */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Achievements</h2>
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {/* Achievement badges will go here */}
        </div>
      </div>
    </div>
  )
}

// Loading skeleton
function StatisticsPageSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
```

---

## 10. Data Fetching Actions

```typescript
// app/actions/statistics.ts
"use server"

import { db } from "@/db"

export interface StatisticsData {
  period: 'week' | 'month' | 'quarter' | 'year' | 'all'
  timeInvestment: {
    games: number
    books: number
    tvShows: number
    movies: number
    total: number
  }
  streak: {
    current: number
    longest: number
  }
  achievements: Achievement[]
  // ... more fields
}

export async function getStatisticsAction(period: string): Promise<StatisticsData> {
  try {
    // Calculate date range based on period
    const dateRange = getDateRange(period)

    // Fetch games stats
    const gamesStats = await db.execute(
      `SELECT
        COUNT(*) as count,
        SUM(hoursPlayed) as totalHours
      FROM games
      WHERE updatedAt >= ? AND updatedAt <= ?`,
      [dateRange.start, dateRange.end]
    )

    // Fetch books stats
    const booksStats = await db.execute(
      `SELECT
        COUNT(*) as count,
        SUM(hours) as totalHours,
        SUM(minutes) / 60.0 as totalMinutes
      FROM books
      WHERE updatedAt >= ? AND updatedAt <= ?`,
      [dateRange.start, dateRange.end]
    )

    // Calculate streak
    const streak = await calculateStreak()

    // Fetch achievements
    const achievements = await getAchievements()

    return {
      period,
      timeInvestment: {
        games: gamesStats.rows[0].totalHours || 0,
        books: (booksStats.rows[0].totalHours || 0) + (booksStats.rows[0].totalMinutes || 0),
        tvShows: 0, // TODO: Calculate from TV shows
        movies: 0, // TODO: Calculate from movies
        total: 0 // Sum of all
      },
      streak,
      achievements,
    }
  } catch (error) {
    console.error('Error fetching statistics:', error)
    throw error
  }
}

function getDateRange(period: string): { start: Date; end: Date } {
  const end = new Date()
  let start = new Date()

  switch (period) {
    case 'week':
      start.setDate(end.getDate() - 7)
      break
    case 'month':
      start.setMonth(end.getMonth() - 1)
      break
    case 'quarter':
      start.setMonth(end.getMonth() - 3)
      break
    case 'year':
      start.setFullYear(end.getFullYear() - 1)
      break
    case 'all':
      start = new Date(0) // Beginning of time
      break
  }

  return { start, end }
}

async function calculateStreak(): Promise<{ current: number; longest: number }> {
  // TODO: Implement streak calculation logic
  // Query all tables for activity dates and calculate consecutive days
  return { current: 0, longest: 0 }
}

async function getAchievements(): Promise<Achievement[]> {
  // TODO: Fetch from achievements table
  return []
}
```

---

**Last Updated:** November 3, 2025
**Version:** 1.0
