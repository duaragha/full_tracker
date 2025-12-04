'use client'

import { useMemo } from 'react'
import { format, parseISO, isToday, isYesterday } from 'date-fns'
import { JournalEntry } from '@/types/journal'
import { JournalEntryCard } from './journal-entry-card'
import { cn } from '@/lib/utils'

interface JournalTimelineProps {
  entries: JournalEntry[]
  onEntryClick?: (entry: JournalEntry) => void
  className?: string
}

interface GroupedEntries {
  date: string
  label: string
  entries: JournalEntry[]
}

function formatDateLabel(dateStr: string): string {
  const date = parseISO(dateStr)

  if (isToday(date)) {
    return `Today - ${format(date, 'MMMM d, yyyy')}`
  }

  if (isYesterday(date)) {
    return `Yesterday - ${format(date, 'MMMM d, yyyy')}`
  }

  return format(date, 'MMMM d, yyyy')
}

export function JournalTimeline({
  entries,
  onEntryClick,
  className,
}: JournalTimelineProps) {
  // Group entries by date
  const groupedEntries = useMemo((): GroupedEntries[] => {
    const groups = new Map<string, JournalEntry[]>()

    // Sort entries by date descending (newest first)
    const sortedEntries = [...entries].sort((a, b) => {
      const dateA = parseISO(`${a.entryDate}T${a.entryTime}`)
      const dateB = parseISO(`${b.entryDate}T${b.entryTime}`)
      return dateB.getTime() - dateA.getTime()
    })

    // Group by date
    for (const entry of sortedEntries) {
      const date = entry.entryDate
      if (!groups.has(date)) {
        groups.set(date, [])
      }
      groups.get(date)!.push(entry)
    }

    // Convert to array with labels
    return Array.from(groups.entries()).map(([date, groupEntries]) => ({
      date,
      label: formatDateLabel(date),
      entries: groupEntries,
    }))
  }, [entries])

  if (entries.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <p className="text-muted-foreground">No journal entries yet.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Start writing to capture your thoughts and memories.
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {groupedEntries.map((group) => (
        <div key={group.date}>
          {/* Date Header */}
          <div className="flex items-center gap-3 py-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-sm font-medium text-muted-foreground">
              {group.label}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Entries for this date */}
          <div className="space-y-3">
            {group.entries.map((entry) => (
              <JournalEntryCard
                key={entry.id}
                entry={entry}
                onClick={() => onEntryClick?.(entry)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
