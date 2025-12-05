'use client'

import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Mood } from '@/types/journal'
import { CalendarDay } from './journal-calendar'

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

const MOOD_EMOJI: Record<Mood, string> = {
  great: '😄',
  good: '😊',
  okay: '😐',
  bad: '😔',
  terrible: '😢',
}

const MOOD_LABEL: Record<Mood, string> = {
  great: 'Great',
  good: 'Good',
  okay: 'Okay',
  bad: 'Bad',
  terrible: 'Terrible',
}

interface MonthlyStats {
  totalEntries: number
  daysInMonth: number
  currentStreak: number
  averageMood: Mood | null
  totalWords: number
}

interface YearOverview {
  monthlyEntryCounts: number[]
  totalYearEntries: number
}

interface JournalCalendarStatsProps {
  year: number
  month: number
  calendarData: CalendarDay[]
  monthlyStats?: MonthlyStats
  yearOverview?: YearOverview
}

function calculateMonthlyStatsFromCalendar(
  calendarData: CalendarDay[],
  year: number,
  month: number
): { totalEntries: number; daysInMonth: number; averageMood: Mood | null } {
  const daysInMonth = new Date(year, month, 0).getDate()
  const totalEntries = calendarData.filter(day => day.hasEntry).length

  // Calculate average mood from calendar data
  const moodScores: Record<Mood, number> = {
    great: 5,
    good: 4,
    okay: 3,
    bad: 2,
    terrible: 1,
  }
  const moodLabels: Mood[] = ['terrible', 'bad', 'okay', 'good', 'great']

  let totalMoodScore = 0
  let moodCount = 0
  for (const day of calendarData) {
    if (day.mood) {
      totalMoodScore += moodScores[day.mood]
      moodCount++
    }
  }

  const averageMood = moodCount > 0
    ? moodLabels[Math.round(totalMoodScore / moodCount) - 1]
    : null

  return { totalEntries, daysInMonth, averageMood }
}

export function JournalCalendarStats({
  year,
  month,
  calendarData,
  monthlyStats,
  yearOverview,
}: JournalCalendarStatsProps) {
  // Calculate stats from calendar data if not provided
  const calculatedStats = calculateMonthlyStatsFromCalendar(calendarData, year, month)

  const totalEntries = monthlyStats?.totalEntries ?? calculatedStats.totalEntries
  const daysInMonth = monthlyStats?.daysInMonth ?? calculatedStats.daysInMonth
  const currentStreak = monthlyStats?.currentStreak ?? 0
  const averageMood = monthlyStats?.averageMood ?? calculatedStats.averageMood
  const totalWords = monthlyStats?.totalWords ?? 0

  const entryPercentage = Math.round((totalEntries / daysInMonth) * 100)
  const monthName = format(new Date(year, month - 1, 1), 'MMMM')

  // Year overview - use provided data or create empty array
  const monthlyEntryCounts = yearOverview?.monthlyEntryCounts ?? new Array(12).fill(0)
  const totalYearEntries = yearOverview?.totalYearEntries ?? 0
  const maxMonthlyEntries = Math.max(...monthlyEntryCounts, 1)

  return (
    <div className="space-y-4">
      {/* Monthly Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">{monthName} Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Entries Progress */}
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-muted-foreground">Entries</span>
              <span>{totalEntries} / {daysInMonth} days</span>
            </div>
            <Progress value={entryPercentage} className="h-1" />
          </div>

          {/* Current Streak */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Current Streak</span>
            <span>{currentStreak} {currentStreak === 1 ? 'day' : 'days'}</span>
          </div>

          {/* Average Mood */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Avg. Mood</span>
            <span>
              {averageMood ? (
                <>
                  {MOOD_EMOJI[averageMood]} {MOOD_LABEL[averageMood]}
                </>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </span>
          </div>

          {/* Total Words */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Words</span>
            <span>{totalWords.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Year Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">{year} Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mini heatmap grid */}
          <div className="grid grid-cols-12 gap-1">
            {MONTH_LABELS.map((label, index) => {
              const entryCount = monthlyEntryCounts[index]
              // Calculate opacity based on entry count (0.2 to 1.0)
              const opacity = entryCount > 0
                ? 0.2 + (entryCount / maxMonthlyEntries) * 0.8
                : 0.1

              return (
                <div key={label + index} className="text-center">
                  <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
                  <div
                    className="w-full aspect-square rounded-sm"
                    style={{
                      backgroundColor: entryCount > 0 ? `rgb(34, 197, 94)` : undefined,
                      opacity: entryCount > 0 ? opacity : 1,
                    }}
                    title={`${entryCount} entries`}
                  >
                    {entryCount === 0 && (
                      <div className="w-full h-full bg-muted rounded-sm" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Total entries this year */}
          <div className="mt-3 text-center text-sm text-muted-foreground">
            {totalYearEntries} {totalYearEntries === 1 ? 'entry' : 'entries'} this year
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
