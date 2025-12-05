'use client'

import { BookOpen, FileText, Flame, Image, BarChart3 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { JournalStats } from '@/types/journal'
import { getMoodEmoji } from './journal-mood-selector'

interface JournalStatsOverviewProps {
  stats: JournalStats
  className?: string
}

interface StatCardProps {
  label: string
  value: string | number
  subtext?: string
  subtextColor?: 'default' | 'green'
  icon?: React.ReactNode
}

function StatCard({ label, value, subtext, subtextColor = 'default' }: StatCardProps) {
  return (
    <Card className="p-4">
      <div className="text-sm text-muted-foreground mb-1">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
      {subtext && (
        <div className={cn(
          'text-xs mt-1',
          subtextColor === 'green' ? 'text-green-500' : 'text-muted-foreground'
        )}>
          {subtext}
        </div>
      )}
    </Card>
  )
}

// Helper to calculate current streak from entry dates
function calculateStreak(entryDates: string[]): { current: number; best: number } {
  if (entryDates.length === 0) return { current: 0, best: 0 }

  const sortedDates = [...entryDates].sort().reverse()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let currentStreak = 0
  let bestStreak = 0
  let tempStreak = 0
  let currentDate = today

  // Calculate current streak
  for (const dateStr of sortedDates) {
    const entryDate = new Date(dateStr)
    entryDate.setHours(0, 0, 0, 0)

    const diffDays = Math.floor(
      (currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffDays === 0 || (currentStreak > 0 && diffDays === 1)) {
      currentStreak++
      currentDate = entryDate
    } else if (diffDays === 1 && currentStreak === 0) {
      currentStreak++
      currentDate = entryDate
    } else {
      break
    }
  }

  // Calculate best streak
  const allDates = [...entryDates].sort()
  let prevDate: Date | null = null

  for (const dateStr of allDates) {
    const entryDate = new Date(dateStr)
    entryDate.setHours(0, 0, 0, 0)

    if (prevDate) {
      const diffDays = Math.floor(
        (entryDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (diffDays === 1) {
        tempStreak++
      } else {
        bestStreak = Math.max(bestStreak, tempStreak)
        tempStreak = 1
      }
    } else {
      tempStreak = 1
    }
    prevDate = entryDate
  }
  bestStreak = Math.max(bestStreak, tempStreak)

  return { current: currentStreak, best: bestStreak }
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

// Calculate year-over-year growth (placeholder)
function calculateYoYGrowth(stats: JournalStats): string | null {
  // This would require historical data comparison
  // For now, return null as we don't have year-over-year data
  return null
}

export function JournalStatsOverview({ stats, className }: JournalStatsOverviewProps) {
  const streak = calculateStreak(stats.entryDates)
  const yoyGrowth = calculateYoYGrowth(stats)

  // Calculate mood score for display
  const moodScores: Record<string, number> = {
    great: 5,
    good: 4,
    okay: 3,
    bad: 2,
    terrible: 1,
  }

  const totalMoods = Object.values(stats.moodDistribution).reduce((a, b) => a + b, 0)
  const avgMoodScore = totalMoods > 0
    ? Object.entries(stats.moodDistribution).reduce((sum, [mood, count]) => {
        return sum + ((moodScores[mood] || 0) * count)
      }, 0) / totalMoods
    : 0

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4', className)}>
      {/* Total Entries */}
      <StatCard
        label="Total Entries"
        value={stats.totalEntries}
        subtext={yoyGrowth ? `${yoyGrowth} vs last year` : `${stats.entryDates.length} unique days`}
        subtextColor={yoyGrowth?.startsWith('+') ? 'green' : 'default'}
      />

      {/* Words Written */}
      <StatCard
        label="Words Written"
        value={formatNumber(stats.totalWords)}
        subtext={`~${Math.round(stats.averageWordCount)} per entry`}
      />

      {/* Current Streak */}
      <StatCard
        label="Current Streak"
        value={streak.current}
        subtext={streak.best > 0 ? `Best: ${streak.best} days` : 'Start writing today'}
      />

      {/* Photos Added - Placeholder */}
      <StatCard
        label="Photos Added"
        value="-"
        subtext="Coming soon"
      />

      {/* Average Mood */}
      <StatCard
        label="Avg. Mood"
        value={getMoodEmoji(stats.averageMood) || '-'}
        subtext={totalMoods > 0
          ? `${stats.averageMood.charAt(0).toUpperCase() + stats.averageMood.slice(1)} (${avgMoodScore.toFixed(1)}/5)`
          : 'No mood data'
        }
      />
    </div>
  )
}
