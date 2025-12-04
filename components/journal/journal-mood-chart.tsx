'use client'

import { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Mood } from '@/types/journal'

interface JournalMoodChartProps {
  moodDistribution: Record<Mood, number>
  className?: string
}

interface MoodData {
  mood: Mood
  emoji: string
  label: string
  count: number
  percentage: number
  colorClass: string
  barColor: string
}

const MOOD_CONFIG: Record<Mood, { emoji: string; label: string; colorClass: string; barColor: string }> = {
  great: {
    emoji: '😄',
    label: 'Great',
    colorClass: 'text-green-500',
    barColor: 'bg-green-500',
  },
  good: {
    emoji: '🙂',
    label: 'Good',
    colorClass: 'text-emerald-500',
    barColor: 'bg-emerald-500',
  },
  okay: {
    emoji: '😐',
    label: 'Okay',
    colorClass: 'text-yellow-500',
    barColor: 'bg-yellow-500',
  },
  bad: {
    emoji: '😟',
    label: 'Bad',
    colorClass: 'text-orange-500',
    barColor: 'bg-orange-500',
  },
  terrible: {
    emoji: '😢',
    label: 'Terrible',
    colorClass: 'text-red-500',
    barColor: 'bg-red-500',
  },
}

export function JournalMoodChart({
  moodDistribution,
  className,
}: JournalMoodChartProps) {
  const moodData = useMemo((): MoodData[] => {
    const total = Object.values(moodDistribution).reduce((a, b) => a + b, 0)

    const moods: Mood[] = ['great', 'good', 'okay', 'bad', 'terrible']

    return moods.map((mood) => {
      const count = moodDistribution[mood] || 0
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0
      const config = MOOD_CONFIG[mood]

      return {
        mood,
        emoji: config.emoji,
        label: config.label,
        count,
        percentage,
        colorClass: config.colorClass,
        barColor: config.barColor,
      }
    })
  }, [moodDistribution])

  const totalEntries = Object.values(moodDistribution).reduce((a, b) => a + b, 0)

  if (totalEntries === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Mood Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No mood data yet. Start adding moods to your entries!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Mood Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {moodData.map((data) => (
            <div key={data.mood}>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-2">
                  <span>{data.emoji}</span>
                  <span>{data.label}</span>
                </span>
                <span className="text-muted-foreground">{data.percentage}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', data.barColor)}
                  style={{ width: `${data.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-4 border-t text-center">
          <p className="text-sm text-muted-foreground">
            Based on {totalEntries} entries with mood data
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
