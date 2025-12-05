'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Mood } from '@/types/journal'

interface JournalMoodDistributionProps {
  moodDistribution: Record<Mood, number>
  className?: string
}

interface MoodConfig {
  emoji: string
  label: string
  barColor: string
  bgColor: string
}

const MOOD_CONFIG: Record<Mood, MoodConfig> = {
  great: {
    emoji: '😄',
    label: 'Great',
    barColor: 'bg-green-500',
    bgColor: 'bg-green-500/20',
  },
  good: {
    emoji: '😊',
    label: 'Good',
    barColor: 'bg-teal-500',
    bgColor: 'bg-teal-500/20',
  },
  okay: {
    emoji: '😐',
    label: 'Okay',
    barColor: 'bg-yellow-500',
    bgColor: 'bg-yellow-500/20',
  },
  bad: {
    emoji: '😔',
    label: 'Bad',
    barColor: 'bg-orange-500',
    bgColor: 'bg-orange-500/20',
  },
  terrible: {
    emoji: '😢',
    label: 'Terrible',
    barColor: 'bg-red-500',
    bgColor: 'bg-red-500/20',
  },
}

const MOOD_ORDER: Mood[] = ['great', 'good', 'okay', 'bad', 'terrible']

export function JournalMoodDistribution({
  moodDistribution,
  className,
}: JournalMoodDistributionProps) {
  const moodData = useMemo(() => {
    const total = Object.values(moodDistribution).reduce((a, b) => a + b, 0)

    return MOOD_ORDER.map((mood) => {
      const count = moodDistribution[mood] || 0
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0
      const config = MOOD_CONFIG[mood]

      return {
        mood,
        ...config,
        count,
        percentage,
      }
    })
  }, [moodDistribution])

  const totalEntries = Object.values(moodDistribution).reduce((a, b) => a + b, 0)

  if (totalEntries === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base font-medium">Mood Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No mood data yet. Add moods to your entries!
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base font-medium">Mood Distribution</CardTitle>
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
                  className={cn('h-full rounded-full transition-all duration-500', data.barColor)}
                  style={{ width: `${data.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
