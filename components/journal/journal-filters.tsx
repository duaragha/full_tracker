'use client'

import { useState, useCallback } from 'react'
import { Search, X, Filter, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { JournalFilters, Mood } from '@/types/journal'

interface JournalFiltersProps {
  filters: JournalFilters
  onChange: (filters: JournalFilters) => void
  availableTags?: string[]
  className?: string
}

const MOOD_OPTIONS: { value: Mood; label: string; emoji: string }[] = [
  { value: 'great', label: 'Great', emoji: '😄' },
  { value: 'good', label: 'Good', emoji: '🙂' },
  { value: 'okay', label: 'Okay', emoji: '😐' },
  { value: 'bad', label: 'Bad', emoji: '😟' },
  { value: 'terrible', label: 'Terrible', emoji: '😢' },
]

export function JournalFiltersComponent({
  filters,
  onChange,
  availableTags = [],
  className,
}: JournalFiltersProps) {
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false)
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...filters, searchText: e.target.value || undefined })
    },
    [filters, onChange]
  )

  const handleMoodChange = useCallback(
    (mood: string) => {
      onChange({
        ...filters,
        mood: mood === 'all' ? undefined : (mood as Mood),
      })
    },
    [filters, onChange]
  )

  const handleTagToggle = useCallback(
    (tag: string) => {
      const currentTags = filters.tags || []
      const newTags = currentTags.includes(tag)
        ? currentTags.filter((t) => t !== tag)
        : [...currentTags, tag]

      onChange({
        ...filters,
        tags: newTags.length > 0 ? newTags : undefined,
      })
    },
    [filters, onChange]
  )

  const handleClearFilters = useCallback(() => {
    onChange({
      searchText: undefined,
      mood: undefined,
      startDate: undefined,
      endDate: undefined,
      tags: undefined,
    })
  }, [onChange])

  const hasActiveFilters =
    filters.searchText ||
    filters.mood ||
    filters.startDate ||
    filters.endDate ||
    (filters.tags && filters.tags.length > 0)

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search & Quick Filters Row */}
      <div className="flex items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search entries..."
            value={filters.searchText || ''}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>

        {/* Mood Filter */}
        <Select
          value={filters.mood || 'all'}
          onValueChange={handleMoodChange}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All moods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All moods</SelectItem>
            {MOOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.emoji} {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Range */}
        <Popover open={isDateRangeOpen} onOpenChange={setIsDateRangeOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Calendar className="w-4 h-4" />
              {filters.startDate || filters.endDate
                ? `${filters.startDate || '...'} - ${filters.endDate || '...'}`
                : 'Date range'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="end">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Start Date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">From</label>
                  <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        {filters.startDate || 'Start date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={
                          filters.startDate
                            ? new Date(filters.startDate)
                            : undefined
                        }
                        onSelect={(date) => {
                          onChange({
                            ...filters,
                            startDate: date
                              ? format(date, 'yyyy-MM-dd')
                              : undefined,
                          })
                          setStartDateOpen(false)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">To</label>
                  <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        {filters.endDate || 'End date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={
                          filters.endDate
                            ? new Date(filters.endDate)
                            : undefined
                        }
                        onSelect={(date) => {
                          onChange({
                            ...filters,
                            endDate: date
                              ? format(date, 'yyyy-MM-dd')
                              : undefined,
                          })
                          setEndDateOpen(false)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="gap-1"
          >
            <X className="w-4 h-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Tag Filters */}
      {availableTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Tags:</span>
          {availableTags.slice(0, 10).map((tag) => {
            const isActive = filters.tags?.includes(tag)
            return (
              <Badge
                key={tag}
                variant={isActive ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => handleTagToggle(tag)}
              >
                #{tag}
              </Badge>
            )
          })}
          {availableTags.length > 10 && (
            <span className="text-xs text-muted-foreground">
              +{availableTags.length - 10} more
            </span>
          )}
        </div>
      )}
    </div>
  )
}
