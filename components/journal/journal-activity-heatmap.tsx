'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface JournalActivityHeatmapProps {
  entryDates: string[]
  className?: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface DayData {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4
}

function getLevel(count: number, maxCount: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0
  if (maxCount <= 1) return count > 0 ? 2 : 0

  const ratio = count / maxCount
  if (ratio <= 0.25) return 1
  if (ratio <= 0.5) return 2
  if (ratio <= 0.75) return 3
  return 4
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function JournalActivityHeatmap({
  entryDates,
  className,
}: JournalActivityHeatmapProps) {
  const { weeks, monthLabels, maxCount } = useMemo(() => {
    // Create a map of dates to entry counts
    const dateCounts: Record<string, number> = {}
    let maxCount = 0

    entryDates.forEach(date => {
      dateCounts[date] = (dateCounts[date] || 0) + 1
      maxCount = Math.max(maxCount, dateCounts[date])
    })

    // Calculate the date range (past year)
    const today = new Date()
    const oneYearAgo = new Date(today)
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    // Adjust to start from Sunday
    const startDate = new Date(oneYearAgo)
    startDate.setDate(startDate.getDate() - startDate.getDay())

    // Generate all weeks
    const weeks: DayData[][] = []
    const monthLabels: { month: string; weekIndex: number }[] = []
    let currentDate = new Date(startDate)
    let lastMonth = -1

    while (currentDate <= today) {
      const week: DayData[] = []

      for (let day = 0; day < 7; day++) {
        const dateStr = currentDate.toISOString().split('T')[0]
        const count = dateCounts[dateStr] || 0
        const isInRange = currentDate >= oneYearAgo && currentDate <= today

        week.push({
          date: dateStr,
          count: isInRange ? count : -1, // -1 means not in range
          level: isInRange ? getLevel(count, maxCount) : 0,
        })

        // Track month labels
        if (isInRange && currentDate.getMonth() !== lastMonth && day === 0) {
          monthLabels.push({
            month: MONTHS[currentDate.getMonth()],
            weekIndex: weeks.length,
          })
          lastMonth = currentDate.getMonth()
        }

        currentDate.setDate(currentDate.getDate() + 1)
      }

      weeks.push(week)
    }

    return { weeks, monthLabels, maxCount }
  }, [entryDates])

  const levelClasses = {
    0: 'bg-muted',
    1: 'bg-green-500/25',
    2: 'bg-green-500/50',
    3: 'bg-green-500/75',
    4: 'bg-green-500',
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base font-medium">Activity Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          {/* Month labels */}
          <div className="flex mb-2 ml-8">
            {monthLabels.map((label, index) => (
              <div
                key={`${label.month}-${index}`}
                className="text-xs text-muted-foreground"
                style={{
                  marginLeft: index === 0 ? label.weekIndex * 14 : (monthLabels[index].weekIndex - monthLabels[index - 1].weekIndex - 1) * 14,
                  minWidth: '28px',
                }}
              >
                {label.month}
              </div>
            ))}
          </div>

          <div className="flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-1 mr-2">
              {DAYS.map((day, index) => (
                <div
                  key={day}
                  className={cn(
                    'text-xs text-muted-foreground h-3 flex items-center',
                    index % 2 === 1 ? 'opacity-100' : 'opacity-0'
                  )}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            <TooltipProvider delayDuration={100}>
              <div className="flex gap-1">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-1">
                    {week.map((day, dayIndex) => (
                      <Tooltip key={`${weekIndex}-${dayIndex}`}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              'w-3 h-3 rounded-sm cursor-default transition-colors',
                              day.count === -1 ? 'opacity-0' : levelClasses[day.level]
                            )}
                          />
                        </TooltipTrigger>
                        {day.count !== -1 && (
                          <TooltipContent side="top" className="text-xs">
                            <p className="font-medium">{formatDate(day.date)}</p>
                            <p className="text-muted-foreground">
                              {day.count} {day.count === 1 ? 'entry' : 'entries'}
                            </p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    ))}
                  </div>
                ))}
              </div>
            </TooltipProvider>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={cn('w-3 h-3 rounded-sm', levelClasses[level as 0 | 1 | 2 | 3 | 4])}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
