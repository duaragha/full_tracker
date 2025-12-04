'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, TrendingUp, Calendar, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { JournalStatsCards } from '@/components/journal/journal-stats-cards'
import { JournalMoodChart } from '@/components/journal/journal-mood-chart'
import { JournalStats } from '@/types/journal'
import { getJournalStatsAction } from '@/lib/actions/journal'

export default function JournalStatsPage() {
  const [stats, setStats] = useState<JournalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/journal">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Statistics</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              Your journaling insights and patterns
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading statistics...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/journal">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Statistics</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              Your journaling insights and patterns
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">{error || 'Unable to load statistics'}</p>
            <Button onClick={loadStats}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (stats.totalEntries === 0) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/journal">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Statistics</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              Your journaling insights and patterns
            </p>
          </div>
        </div>
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/journal">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Statistics</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              Your journaling insights and patterns
            </p>
          </div>
        </div>
        <Button asChild size="sm">
          <Link href="/journal/new">
            <Plus className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            New Entry
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <JournalStatsCards stats={stats} />

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Mood Distribution */}
        <JournalMoodChart moodDistribution={stats.moodDistribution} />

        {/* Top Tags */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Top Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topTags.length > 0 ? (
              <div className="space-y-3">
                {stats.topTags.map((tag, index) => (
                  <div
                    key={tag.name}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground w-5">
                        {index + 1}.
                      </span>
                      <Badge variant="secondary">#{tag.name}</Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {tag.count} {tag.count === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No tags used yet. Add tags to your entries to see them here!
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Writing Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Writing Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{stats.totalEntries}</p>
              <p className="text-sm text-muted-foreground">Total Entries</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{stats.entryDates.length}</p>
              <p className="text-sm text-muted-foreground">Days with Entries</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">
                {stats.entryDates.length > 0
                  ? (stats.totalEntries / stats.entryDates.length).toFixed(1)
                  : '0'}
              </p>
              <p className="text-sm text-muted-foreground">Entries per Active Day</p>
            </div>
          </div>

          {/* Activity Heatmap Placeholder */}
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-muted-foreground text-center">
              Writing activity visualization coming soon
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
