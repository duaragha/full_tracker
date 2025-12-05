'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeft, Plus, Globe, MapPin, Calendar, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { JournalViewTabs } from '@/components/journal/journal-view-tabs'
import { JournalEntry } from '@/types/journal'
import { getJournalEntriesAction } from '@/lib/actions/journal'

export default function JournalMapPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)

  // Load entries with locations
  const loadEntries = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch all entries and filter for those with locations
      const { entries: allEntries } = await getJournalEntriesAction({}, 1, 100)
      const entriesWithLocation = allEntries.filter(entry => entry.location && entry.location.trim() !== '')
      setEntries(entriesWithLocation)
    } catch (error) {
      console.error('Failed to load journal entries:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  const handleEntryClick = (entry: JournalEntry) => {
    router.push(`/journal/${entry.id}`)
  }

  // Group entries by location
  const entriesByLocation = entries.reduce<Record<string, JournalEntry[]>>((acc, entry) => {
    const location = entry.location || 'Unknown'
    if (!acc[location]) {
      acc[location] = []
    }
    acc[location].push(entry)
    return acc
  }, {})

  const uniqueLocations = Object.keys(entriesByLocation).length

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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Map View</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              See your entries around the world
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

      {/* View Tabs */}
      <JournalViewTabs />

      {/* Map Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Map Placeholder (2 cols) */}
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            <div className="aspect-video flex flex-col items-center justify-center bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/20">
              <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                <Globe className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Interactive Map Coming Soon</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md px-4">
                Soon you will be able to see all your journal entries on an interactive map.
                Add locations to your entries to see them displayed here.
              </p>
              <div className="flex items-center gap-6 mt-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{uniqueLocations} location{uniqueLocations !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{entries.length} entr{entries.length !== 1 ? 'ies' : 'y'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Entries with locations (1 col) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Entries by Location
            </CardTitle>
            <CardDescription>
              {entries.length > 0
                ? `${entries.length} entries with locations`
                : 'No entries with locations yet'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Loading entries...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                  <MapPin className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Add locations to your journal entries to see them here
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/journal/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Entry with Location
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {Object.entries(entriesByLocation).map(([location, locationEntries]) => (
                  <div key={location} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{location}</span>
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
                        {locationEntries.length}
                      </span>
                    </div>
                    <div className="space-y-1 pl-5">
                      {locationEntries.map((entry) => (
                        <button
                          key={entry.id}
                          onClick={() => handleEntryClick(entry)}
                          className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors group flex items-center justify-between"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{entry.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(entry.entryDate), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
