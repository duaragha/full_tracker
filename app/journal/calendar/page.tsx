'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeft, Plus, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { JournalCalendar, CalendarDay } from '@/components/journal/journal-calendar'
import { JournalCalendarStats } from '@/components/journal/journal-calendar-stats'
import { JournalTimeline } from '@/components/journal/journal-timeline'
import { JournalEntry, Mood } from '@/types/journal'
import {
  getCalendarDataAction,
  getJournalEntriesAction,
} from '@/lib/actions/journal'

interface YearOverview {
  monthlyEntryCounts: number[]
  totalYearEntries: number
}

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
  const [yearOverview, setYearOverview] = useState<YearOverview | null>(null)
  const [monthlyStats, setMonthlyStats] = useState<{
    totalEntries: number
    daysInMonth: number
    currentStreak: number
    averageMood: Mood | null
    totalWords: number
  } | null>(null)

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

  // Load year overview data
  const loadYearOverview = useCallback(async () => {
    try {
      const monthPromises = Array.from({ length: 12 }, (_, i) =>
        getCalendarDataAction(year, i + 1).catch(() => [])
      )
      const monthsData = await Promise.all(monthPromises)
      const monthlyEntryCounts = monthsData.map(data => data.filter(d => d.hasEntry).length)
      const totalYearEntries = monthlyEntryCounts.reduce((a, b) => a + b, 0)
      setYearOverview({ monthlyEntryCounts, totalYearEntries })
    } catch (error) {
      console.error('Failed to load year overview:', error)
    }
  }, [year])

  // Load monthly stats
  const loadMonthlyStats = useCallback(async () => {
    try {
      const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd')
      const endDate = format(new Date(year, month, 0), 'yyyy-MM-dd')
      const { entries } = await getJournalEntriesAction({ startDate, endDate }, 1, 100)

      const daysInMonth = new Date(year, month, 0).getDate()
      const totalEntries = entries.length
      const totalWords = entries.reduce((sum, e) => sum + (e.wordCount || 0), 0)

      // Calculate average mood
      const moodScores: Record<Mood, number> = { great: 5, good: 4, okay: 3, bad: 2, terrible: 1 }
      const moodLabels: Mood[] = ['terrible', 'bad', 'okay', 'good', 'great']

      let totalMoodScore = 0
      let moodCount = 0
      for (const entry of entries) {
        if (entry.mood) {
          totalMoodScore += moodScores[entry.mood]
          moodCount++
        }
      }
      const averageMood = moodCount > 0
        ? moodLabels[Math.round(totalMoodScore / moodCount) - 1]
        : null

      // Calculate current streak
      const entryDates = new Set(entries.map(e => e.entryDate))
      let currentStreak = 0
      const today = new Date()
      const checkDate = new Date(today)

      while (true) {
        const dateStr = format(checkDate, 'yyyy-MM-dd')
        if (entryDates.has(dateStr)) {
          currentStreak++
          checkDate.setDate(checkDate.getDate() - 1)
        } else if (currentStreak === 0 && format(today, 'yyyy-MM-dd') === dateStr) {
          // Allow skipping today if no entry yet
          checkDate.setDate(checkDate.getDate() - 1)
        } else {
          break
        }
      }

      setMonthlyStats({ totalEntries, daysInMonth, currentStreak, averageMood, totalWords })
    } catch (error) {
      console.error('Failed to load monthly stats:', error)
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
    loadMonthlyStats()
  }, [loadCalendarData, loadMonthlyStats])

  useEffect(() => {
    loadYearOverview()
  }, [loadYearOverview])

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

      {/* Main Content - 3 Column Layout */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Calendar */}
        <div className="flex-1 min-w-0">
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
        <div className="flex-1 min-w-0">
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

        {/* Right Sidebar - Stats */}
        <div className="lg:w-72 shrink-0">
          <JournalCalendarStats
            year={year}
            month={month}
            calendarData={calendarData}
            monthlyStats={monthlyStats || undefined}
            yearOverview={yearOverview || undefined}
          />
        </div>
      </div>
    </div>
  )
}
