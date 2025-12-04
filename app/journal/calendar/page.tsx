'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeft, Plus, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { JournalCalendar, CalendarDay } from '@/components/journal/journal-calendar'
import { JournalTimeline } from '@/components/journal/journal-timeline'
import { JournalEntry } from '@/types/journal'
import {
  getCalendarDataAction,
  getJournalEntriesAction,
} from '@/lib/actions/journal'

export default function JournalCalendarPage() {
  const router = useRouter()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 1-12
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedDateEntries, setSelectedDateEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingEntries, setLoadingEntries] = useState(false)

  // Load calendar data for current month
  const loadCalendarData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getCalendarDataAction(year, month)
      setCalendarData(data)
    } catch (error) {
      console.error('Failed to load calendar data:', error)
    } finally {
      setLoading(false)
    }
  }, [year, month])

  // Load entries for selected date
  const loadEntriesForDate = useCallback(async (date: string) => {
    setLoadingEntries(true)
    try {
      const { entries } = await getJournalEntriesAction(
        { startDate: date, endDate: date },
        1,
        50
      )
      setSelectedDateEntries(entries)
    } catch (error) {
      console.error('Failed to load entries for date:', error)
      setSelectedDateEntries([])
    } finally {
      setLoadingEntries(false)
    }
  }, [])

  useEffect(() => {
    loadCalendarData()
  }, [loadCalendarData])

  useEffect(() => {
    if (selectedDate) {
      loadEntriesForDate(selectedDate)
    }
  }, [selectedDate, loadEntriesForDate])

  const handleMonthChange = (newYear: number, newMonth: number) => {
    setYear(newYear)
    setMonth(newMonth)
    setSelectedDate(null)
    setSelectedDateEntries([])
  }

  const handleDayClick = (date: string) => {
    setSelectedDate(date)
  }

  const handleEntryClick = (entry: JournalEntry) => {
    router.push(`/journal/${entry.id}`)
  }

  const formattedSelectedDate = selectedDate
    ? format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')
    : null

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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Calendar</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              View your journal entries by date
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

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Calendar */}
        <div>
          {loading ? (
            <Card className="p-6">
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Loading calendar...</p>
              </div>
            </Card>
          ) : (
            <JournalCalendar
              year={year}
              month={month}
              calendarData={calendarData}
              onDayClick={handleDayClick}
              onMonthChange={handleMonthChange}
              selectedDate={selectedDate || undefined}
            />
          )}
        </div>

        {/* Selected Date Entries */}
        <div>
          {selectedDate ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{formattedSelectedDate}</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingEntries ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-muted-foreground">Loading entries...</p>
                  </div>
                ) : selectedDateEntries.length > 0 ? (
                  <JournalTimeline
                    entries={selectedDateEntries}
                    onEntryClick={handleEntryClick}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <BookOpen className="h-8 w-8 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground text-center mb-4">
                      No entries for this date
                    </p>
                    <Button asChild size="sm">
                      <Link href="/journal/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Write Entry
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a Date</h3>
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                  Click on a date in the calendar to view entries from that day.
                  Dates with entries are marked with colored dots.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
