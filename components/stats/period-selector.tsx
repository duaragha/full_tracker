"use client"

import { Button } from "@/components/ui/button"
import { TimePeriod } from "@/app/actions/stats"

interface PeriodSelectorProps {
  selected: TimePeriod
  onChange: (period: TimePeriod) => void
}

export function PeriodSelector({ selected, onChange }: PeriodSelectorProps) {
  const periods: { value: TimePeriod; label: string }[] = [
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "year", label: "Year" },
    { value: "all", label: "All Time" },
  ]

  return (
    <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-lg">
      {periods.map((period) => (
        <Button
          key={period.value}
          variant={selected === period.value ? "default" : "ghost"}
          size="sm"
          onClick={() => onChange(period.value)}
          className="h-8 px-3 transition-all"
        >
          {period.label}
        </Button>
      ))}
    </div>
  )
}
