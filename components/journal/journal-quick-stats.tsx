'use client'

import { BookOpen, Flame, Calendar, Smile } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { JournalStats, Mood } from '@/types/journal'
import { getMoodLabel, getMoodColorClass } from './journal-mood-selector'
import { cn } from '@/lib/utils'

interface JournalQuickStatsProps {
  stats: JournalStats | null
  thisWeekCount: number
  lastWeekCount: number
  currentStreak: number
  bestStreak: number
  loading?: boolean
  className?: string
}

export function JournalQuickStats({
  stats,
  thisWeekCount,
  lastWeekCount,
  currentStreak,
  bestStreak,
  loading = false,
  className,
}: JournalQuickStatsProps) {
  const weekDiff = thisWeekCount - lastWeekCount
  const weekDiffText = weekDiff > 0
    ? `+${weekDiff} from last week`
    : weekDiff < 0
      ? `${weekDiff} from last week`
      : 'Same as last week'

  if (loading) {
    return (
      <div className={cn('grid gap-4 grid-cols-2 lg:grid-cols-4', className)}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-4 w-4 bg-muted rounded" />
                </div>
                <div className="h-7 w-16 bg-muted rounded mb-1" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('grid gap-4 grid-cols-2 lg:grid-cols-4', className)}>
      {/* Total Entries */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Entries</span>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold mt-2">
            {stats?.totalEntries ?? 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Since Jan 2024
          </p>
        </CardContent>
      </Card>

      {/* Current Streak */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current Streak</span>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold mt-2">
            {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Best: {bestStreak} days
          </p>
        </CardContent>
      </Card>

      {/* This Week */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">This Week</span>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold mt-2">
            {thisWeekCount} {thisWeekCount === 1 ? 'entry' : 'entries'}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {weekDiffText}
          </p>
        </CardContent>
      </Card>

      {/* Average Mood */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Avg. Mood</span>
            <Smile className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className={cn(
            'text-2xl font-bold mt-2',
            getMoodColorClass(stats?.averageMood)
          )}>
            {stats?.averageMood ? getMoodLabel(stats.averageMood) : 'N/A'}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Based on 30 days
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
