'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { JournalStatsOverview } from '@/components/journal/journal-stats-overview'
import { JournalWritingFrequencyChart } from '@/components/journal/journal-writing-frequency-chart'
import { JournalMoodDistribution } from '@/components/journal/journal-mood-distribution'
import { JournalActivityHeatmap } from '@/components/journal/journal-activity-heatmap'
import { JournalTopTags } from '@/components/journal/journal-top-tags'
import { JournalStats } from '@/types/journal'
import { getJournalStatsAction } from '@/lib/actions/journal'

type TimePeriod = '30d' | '90d' | 'year' | 'all'

export default function JournalStatsPage() {
  const [stats, setStats] = useState<JournalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('year')

  const loadStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const fetchedStats = await getJournalStatsAction()
      setStats(fetchedStats)
    } catch (err) {
      console.error('Failed to load stats:', err)
      setError('Failed to load journal statistics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  // Filter stats based on time period
  const filteredStats = stats ? filterStatsByPeriod(stats, timePeriod) : null

  if (loading) {
    return (
      <div className="space-y-6">
        <StatsPageHeader
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
        />
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading statistics...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !filteredStats) {
    return (
      <div className="space-y-6">
        <StatsPageHeader
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
        />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">{error || 'Unable to load statistics'}</p>
            <Button onClick={loadStats}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (filteredStats.totalEntries === 0) {
    return (
      <div className="space-y-6">
        <StatsPageHeader
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
        />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Data Yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
              Start writing journal entries to see your statistics, mood patterns,
              and writing insights.
            </p>
            <Button asChild>
              <Link href="/journal/new">
                <Plus className="mr-2 h-4 w-4" />
                Write Your First Entry
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <StatsPageHeader
        timePeriod={timePeriod}
        onTimePeriodChange={setTimePeriod}
      />

      {/* View Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
        <Link
          href="/journal"
          className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md transition-colors"
        >
          Timeline
        </Link>
        <Link
          href="/journal/calendar"
          className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md transition-colors"
        >
          Calendar
        </Link>
        <button className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md transition-colors">
          Map
        </button>
        <button className="px-3 py-1.5 text-sm font-medium bg-background rounded-md shadow-sm">
          Stats
        </button>
      </div>

      {/* Overview Stats - 5 cards in a row */}
      <JournalStatsOverview stats={filteredStats} />

      {/* Writing Frequency & Mood Distribution - 2 column grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <JournalWritingFrequencyChart entryDates={filteredStats.entryDates} />
        <JournalMoodDistribution moodDistribution={filteredStats.moodDistribution} />
      </div>

      {/* Activity Heatmap & Top Tags - 3 column grid (2:1 ratio) */}
      <div className="grid gap-6 lg:grid-cols-3">
        <JournalActivityHeatmap
          entryDates={filteredStats.entryDates}
          className="lg:col-span-2"
        />
        <JournalTopTags tags={filteredStats.topTags} />
      </div>
    </div>
  )
}

interface StatsPageHeaderProps {
  timePeriod: TimePeriod
  onTimePeriodChange: (period: TimePeriod) => void
}

function StatsPageHeader({ timePeriod, onTimePeriodChange }: StatsPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Journal Insights</h1>
        <p className="text-muted-foreground">
          Analytics and patterns from your journal entries
        </p>
      </div>
      <Select value={timePeriod} onValueChange={(value) => onTimePeriodChange(value as TimePeriod)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="30d">Last 30 days</SelectItem>
          <SelectItem value="90d">Last 90 days</SelectItem>
          <SelectItem value="year">This year</SelectItem>
          <SelectItem value="all">All time</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

// Helper function to filter stats by time period
function filterStatsByPeriod(stats: JournalStats, period: TimePeriod): JournalStats {
  if (period === 'all') {
    return stats
  }

  const now = new Date()
  let startDate: Date

  switch (period) {
    case '30d':
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 30)
      break
    case '90d':
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 90)
      break
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    default:
      return stats
  }

  const startDateStr = startDate.toISOString().split('T')[0]

  // Filter entry dates
  const filteredEntryDates = stats.entryDates.filter(date => date >= startDateStr)

  // Since we don't have per-entry data here, we'll show the stats as-is
  // In a real implementation, you'd need to recalculate stats from filtered entries
  // For now, we just filter the entry dates for the heatmap
  return {
    ...stats,
    entryDates: filteredEntryDates,
  }
}
