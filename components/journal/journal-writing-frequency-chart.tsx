'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  Tooltip,
} from 'recharts'

interface JournalWritingFrequencyChartProps {
  entryDates: string[]
  className?: string
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function JournalWritingFrequencyChart({
  entryDates,
  className,
}: JournalWritingFrequencyChartProps) {
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  const monthlyData = useMemo(() => {
    // Count entries per month for the current year
    const monthlyCounts: Record<number, number> = {}

    entryDates.forEach(dateStr => {
      const date = new Date(dateStr)
      if (date.getFullYear() === currentYear) {
        const month = date.getMonth()
        monthlyCounts[month] = (monthlyCounts[month] || 0) + 1
      }
    })

    // Create data for all 12 months
    return MONTHS.map((name, index) => ({
      name,
      month: index,
      entries: monthlyCounts[index] || 0,
      isCurrent: index === currentMonth,
      isFuture: index > currentMonth,
    }))
  }, [entryDates, currentMonth, currentYear])

  const maxEntries = Math.max(...monthlyData.map(d => d.entries), 1)

  if (entryDates.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base font-medium">Writing Frequency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No entries yet. Start writing to see your frequency!
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base font-medium">Writing Frequency</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                width={40}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-popover border rounded-lg px-3 py-2 shadow-lg">
                        <p className="text-sm font-medium">{data.name} {currentYear}</p>
                        <p className="text-sm text-muted-foreground">
                          {data.entries} {data.entries === 1 ? 'entry' : 'entries'}
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="entries" radius={[4, 4, 0, 0]}>
                {monthlyData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    className={cn(
                      entry.isFuture
                        ? 'fill-muted'
                        : entry.isCurrent
                        ? 'fill-blue-500/50'
                        : 'fill-blue-500'
                    )}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
