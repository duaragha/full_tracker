'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Calendar, BarChart3, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { JournalTimeline } from '@/components/journal/journal-timeline'
import { JournalFiltersComponent } from '@/components/journal/journal-filters'
import { JournalEntry, JournalFilters } from '@/types/journal'
import {
  getJournalEntriesAction,
  getJournalTagsAction,
} from '@/lib/actions/journal'

export default function JournalPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [totalEntries, setTotalEntries] = useState(0)
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [filters, setFilters] = useState<JournalFilters>({})
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
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

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  useEffect(() => {
    loadTags()
  }, [loadTags])

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
            Write and reflect on your daily thoughts
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/journal/calendar">
              <Calendar className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Calendar
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/journal/stats">
              <BarChart3 className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Stats
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/journal/new">
              <Plus className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              New Entry
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-1.5 sm:gap-2 md:gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Entries</p>
                <p className="text-xl sm:text-2xl font-bold">{totalEntries}</p>
              </div>
              <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">This Week</p>
                <p className="text-xl sm:text-2xl font-bold">
                  {entries.filter((e) => {
                    const entryDate = new Date(e.entryDate)
                    const now = new Date()
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                    return entryDate >= weekAgo
                  }).length}
                </p>
              </div>
              <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Tags Used</p>
                <p className="text-xl sm:text-2xl font-bold">{availableTags.length}</p>
              </div>
              <span className="text-xl sm:text-2xl">#</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Showing</p>
                <p className="text-xl sm:text-2xl font-bold">{entries.length}</p>
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground">of {totalEntries}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList className="grid w-full grid-cols-1 max-w-md">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
