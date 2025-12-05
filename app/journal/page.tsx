'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { JournalTimeline } from '@/components/journal/journal-timeline'
import { JournalFiltersComponent } from '@/components/journal/journal-filters'
import { JournalQuickStats } from '@/components/journal/journal-quick-stats'
import { JournalViewTabs } from '@/components/journal/journal-view-tabs'
import { JournalEntry, JournalFilters, JournalStats } from '@/types/journal'
import {
  getJournalEntriesAction,
  getJournalTagsAction,
  getJournalStatsAction,
} from '@/lib/actions/journal'

export default function JournalPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [totalEntries, setTotalEntries] = useState(0)
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [filters, setFilters] = useState<JournalFilters>({})
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [stats, setStats] = useState<JournalStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const limit = 20

  // Load entries
  const loadEntries = useCallback(async () => {
    setLoading(true)
    try {
      const { entries: fetchedEntries, total } = await getJournalEntriesAction(
        filters,
        page,
        limit
      )
      setEntries(fetchedEntries)
      setTotalEntries(total)
    } catch (error) {
      console.error('Failed to load journal entries:', error)
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  // Load tags
  const loadTags = useCallback(async () => {
    try {
      const tags = await getJournalTagsAction()
      setAvailableTags(tags.map((t) => t.name))
    } catch (error) {
      console.error('Failed to load tags:', error)
    }
  }, [])

  // Load stats
  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const fetchedStats = await getJournalStatsAction()
      setStats(fetchedStats)
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  // Calculate week counts and streak from entries
  const { thisWeekCount, lastWeekCount, currentStreak, bestStreak } = useMemo(() => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    const thisWeek = entries.filter(e => new Date(e.entryDate) >= weekAgo).length
    const lastWeek = entries.filter(e => {
      const d = new Date(e.entryDate)
      return d >= twoWeeksAgo && d < weekAgo
    }).length

    // Simple streak calculation
    const sortedDates = [...new Set(entries.map(e => e.entryDate))].sort().reverse()
    let streak = 0
    const today = new Date().toISOString().split('T')[0]
    let checkDate = today

    for (const date of sortedDates) {
      if (date === checkDate || (streak === 0 && date === sortedDates[0])) {
        streak++
        const d = new Date(checkDate)
        d.setDate(d.getDate() - 1)
        checkDate = d.toISOString().split('T')[0]
      } else {
        break
      }
    }

    return { thisWeekCount: thisWeek, lastWeekCount: lastWeek, currentStreak: streak, bestStreak: streak }
  }, [entries])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  useEffect(() => {
    loadTags()
  }, [loadTags])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const handleFiltersChange = (newFilters: JournalFilters) => {
    setFilters(newFilters)
    setPage(1) // Reset to first page on filter change
  }

  const handleEntryClick = (entry: JournalEntry) => {
    router.push(`/journal/${entry.id}`)
  }

  const hasMorePages = page * limit < totalEntries

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Journal</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
            Your personal thoughts and daily reflections
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/journal/new">
            <Plus className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            New Entry
          </Link>
        </Button>
      </div>

      {/* Quick Stats */}
      <JournalQuickStats
        stats={stats}
        thisWeekCount={thisWeekCount}
        lastWeekCount={lastWeekCount}
        currentStreak={currentStreak}
        bestStreak={bestStreak}
        loading={statsLoading}
      />

      {/* View Tabs */}
      <JournalViewTabs />

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <JournalFiltersComponent
            filters={filters}
            onChange={handleFiltersChange}
            availableTags={availableTags}
          />
        </CardContent>
      </Card>

      {/* Timeline */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading entries...</p>
          </CardContent>
        </Card>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16">
            <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">No journal entries yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
              {Object.keys(filters).length > 0
                ? 'No entries match your current filters. Try adjusting or clearing them.'
                : 'Start capturing your thoughts and memories by writing your first entry.'}
            </p>
            {Object.keys(filters).length === 0 && (
              <Button asChild>
                <Link href="/journal/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Write Your First Entry
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <JournalTimeline entries={entries} onEntryClick={handleEntryClick} />

          {/* Pagination */}
          {(page > 1 || hasMorePages) && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMorePages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
