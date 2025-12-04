'use client'

import { useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Mood } from '@/types/journal'

export interface CalendarDay {
  date: string
  hasEntry: boolean
  entryCount: number
  mood?: Mood
}

interface JournalCalendarProps {
  year: number
  month: number // 1-12
  calendarData: CalendarDay[]
  onDayClick?: (date: string) => void
  onMonthChange?: (year: number, month: number) => void
  selectedDate?: string
  className?: string
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getMoodDotClass(mood?: Mood): string {
  switch (mood) {
    case 'great':
      return 'bg-green-500'
    case 'good':
      return 'bg-emerald-500'
    case 'okay':
      return 'bg-yellow-500'
    case 'bad':
      return 'bg-orange-500'
    case 'terrible':
      return 'bg-red-500'
    default:
      return 'bg-primary'
  }
}

export function JournalCalendar({
  year,
  month,
  calendarData,
  onDayClick,
  onMonthChange,
  selectedDate,
  className,
}: JournalCalendarProps) {
  // Create a map for quick lookup
  const calendarMap = useMemo(() => {
    const map = new Map<string, CalendarDay>()
    for (const day of calendarData) {
      map.set(day.date, day)
    }
    return map
  }, [calendarData])

  // Generate calendar grid
  const calendarGrid = useMemo(() => {
    const currentDate = new Date(year, month - 1, 1)
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

    // Get the day of week for the first day (0 = Sunday)
    const startDayOfWeek = getDay(monthStart)

    // Create grid with padding for previous month
    const grid: Array<{ date: Date; inCurrentMonth: boolean } | null> = []

    // Add empty cells for days before the month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      grid.push(null)
    }

    // Add all days of the month
    for (const day of daysInMonth) {
      grid.push({ date: day, inCurrentMonth: true })
    }

    // Pad to complete the last week
    while (grid.length % 7 !== 0) {
      grid.push(null)
    }

    return grid
  }, [year, month])

  const handlePrevMonth = () => {
    const prevDate = subMonths(new Date(year, month - 1, 1), 1)
    onMonthChange?.(prevDate.getFullYear(), prevDate.getMonth() + 1)
  }

  const handleNextMonth = () => {
    const nextDate = addMonths(new Date(year, month - 1, 1), 1)
    onMonthChange?.(nextDate.getFullYear(), nextDate.getMonth() + 1)
  }

  const monthLabel = format(new Date(year, month - 1, 1), 'MMMM yyyy')

  return (
    <Card className={cn('p-6', className)}>
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevMonth}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-xl font-semibold">{monthLabel}</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextMonth}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-sm text-muted-foreground py-2"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-2">
        {calendarGrid.map((cell, index) => {
          if (!cell) {
            return <div key={`empty-${index}`} className="aspect-square" />
          }

          const dateStr = format(cell.date, 'yyyy-MM-dd')
          const dayData = calendarMap.get(dateStr)
          const isCurrentDay = isToday(cell.date)
          const isSelected = selectedDate === dateStr

          return (
            <button
              key={dateStr}
              onClick={() => onDayClick?.(dateStr)}
              className={cn(
                'aspect-square flex flex-col items-center justify-start p-2 rounded-lg transition-colors relative',
                'hover:bg-muted',
                isCurrentDay && 'bg-muted border-2 border-primary',
                isSelected && 'bg-primary text-primary-foreground',
                !cell.inCurrentMonth && 'opacity-30'
              )}
            >
              <span className={cn('font-medium', isCurrentDay && 'font-bold')}>
                {format(cell.date, 'd')}
              </span>

              {/* Mood indicator dot */}
              {dayData?.hasEntry && (
                <div
                  className={cn(
                    'w-2 h-2 rounded-full mt-1',
                    getMoodDotClass(dayData.mood)
                  )}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-6 pt-4 border-t">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          Great
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          Good
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          Okay
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          Bad
        </div>
      </div>
    </Card>
  )
}
