'use client'

import { BookOpen, Flame, FileText, BarChart3 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { JournalStats } from '@/types/journal'
import { getMoodEmoji, getMoodLabel } from './journal-mood-selector'

interface JournalStatsCardsProps {
  stats: JournalStats
  className?: string
}

interface StatCardProps {
  label: string
  value: string | number
  subtext?: string
  icon: React.ReactNode
  trend?: {
    direction: 'up' | 'down' | 'neutral'
    value: string
  }
}

function StatCard({ label, value, subtext, icon, trend }: StatCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardDescription className="text-xs font-medium">
            {label}
          </CardDescription>
          <div className="text-muted-foreground">{icon}</div>
        </div>
        <div className="flex items-center gap-2">
          <CardTitle className="text-2xl font-bold">{value}</CardTitle>
          {trend && (
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] h-5',
                trend.direction === 'up' &&
                  'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/30 dark:border-green-900/30',
                trend.direction === 'down' &&
                  'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-900/30'
              )}
            >
              {trend.value}
            </Badge>
          )}
        </div>
        {subtext && (
          <p className="text-xs text-muted-foreground">{subtext}</p>
        )}
      </CardHeader>
    </Card>
  )
}

export function JournalStatsCards({ stats, className }: JournalStatsCardsProps) {
  // Calculate streak from entry dates
  const currentStreak = calculateStreak(stats.entryDates)

  return (
    <div className={cn('grid grid-cols-4 gap-4', className)}>
      {/* Total Entries */}
      <StatCard
        label="Total Entries"
        value={stats.totalEntries}
        subtext={`${stats.entryDates.length} days with entries`}
        icon={<BookOpen className="w-4 h-4" />}
      />

      {/* Current Streak */}
      <StatCard
        label="Current Streak"
        value={`${currentStreak} days`}
        subtext={currentStreak > 0 ? 'Keep it going!' : 'Start writing today'}
        icon={<Flame className="w-4 h-4" />}
      />

      {/* Words Written */}
      <StatCard
        label="Words Written"
        value={formatNumber(stats.totalWords)}
        subtext={`~${stats.averageWordCount} per entry`}
        icon={<FileText className="w-4 h-4" />}
      />

      {/* Average Mood */}
      <StatCard
        label="Avg. Mood"
        value={getMoodEmoji(stats.averageMood) || '-'}
        subtext={getMoodLabel(stats.averageMood) || 'No mood data'}
        icon={<BarChart3 className="w-4 h-4" />}
      />
    </div>
  )
}

// Helper to calculate current streak from entry dates
function calculateStreak(entryDates: string[]): number {
  if (entryDates.length === 0) return 0

  const sortedDates = [...entryDates].sort().reverse()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let streak = 0
  let currentDate = today

  for (const dateStr of sortedDates) {
    const entryDate = new Date(dateStr)
    entryDate.setHours(0, 0, 0, 0)

    const diffDays = Math.floor(
      (currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffDays === 0 || (streak > 0 && diffDays === 1)) {
      streak++
      currentDate = entryDate
    } else if (diffDays === 1 && streak === 0) {
      // Started yesterday
      streak++
      currentDate = entryDate
    } else {
      break
    }
  }

  return streak
}

// Helper to format large numbers
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}
