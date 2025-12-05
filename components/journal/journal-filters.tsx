'use client'

import { useState, useCallback, useMemo } from 'react'
import { Search, X, Calendar, Image, ArrowUpDown, Check, Tag } from 'lucide-react'
import { format, startOfWeek, startOfMonth } from 'date-fns'
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
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
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

type QuickFilter = 'thisWeek' | 'thisMonth' | 'hasPhotos'

export function JournalFiltersComponent({
  filters,
  onChange,
  availableTags = [],
  className,
}: JournalFiltersProps) {
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false)
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)
  const [isTagsDialogOpen, setIsTagsDialogOpen] = useState(false)

  // Determine active quick filters
  const activeQuickFilters = useMemo(() => {
    const active: QuickFilter[] = []
    const today = new Date()
    const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const monthStart = format(startOfMonth(today), 'yyyy-MM-dd')
    const todayStr = format(today, 'yyyy-MM-dd')

    if (filters.startDate === weekStart && filters.endDate === todayStr) {
      active.push('thisWeek')
    }
    if (filters.startDate === monthStart && filters.endDate === todayStr) {
      active.push('thisMonth')
    }
    if (filters.hasPhotos) {
      active.push('hasPhotos')
    }
    return active
  }, [filters.startDate, filters.endDate, filters.hasPhotos])

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...filters, searchText: e.target.value || undefined })
    },
    [filters, onChange]
  )

  const handleClearSearch = useCallback(() => {
    onChange({ ...filters, searchText: undefined })
  }, [filters, onChange])

  const handleMoodChange = useCallback(
    (mood: string) => {
      onChange({
        ...filters,
        mood: mood === 'all' ? undefined : (mood as Mood),
      })
    },
    [filters, onChange]
  )

  const handleSortChange = useCallback(
    (sortOrder: string) => {
      onChange({
        ...filters,
        sortOrder: sortOrder === 'default' ? undefined : (sortOrder as 'newest' | 'oldest'),
      })
    },
    [filters, onChange]
  )

  const handleQuickFilterToggle = useCallback(
    (filter: QuickFilter) => {
      const today = new Date()
      const todayStr = format(today, 'yyyy-MM-dd')

      if (filter === 'thisWeek') {
        const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
        const isActive = activeQuickFilters.includes('thisWeek')
        onChange({
          ...filters,
          startDate: isActive ? undefined : weekStart,
          endDate: isActive ? undefined : todayStr,
        })
      } else if (filter === 'thisMonth') {
        const monthStart = format(startOfMonth(today), 'yyyy-MM-dd')
        const isActive = activeQuickFilters.includes('thisMonth')
        onChange({
          ...filters,
          startDate: isActive ? undefined : monthStart,
          endDate: isActive ? undefined : todayStr,
        })
      } else if (filter === 'hasPhotos') {
        onChange({
          ...filters,
          hasPhotos: filters.hasPhotos ? undefined : true,
        })
      }
    },
    [filters, onChange, activeQuickFilters]
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

  const handleRemoveFilter = useCallback(
    (filterType: string, value?: string) => {
      const newFilters = { ...filters }

      switch (filterType) {
        case 'search':
          newFilters.searchText = undefined
          break
        case 'mood':
          newFilters.mood = undefined
          break
        case 'dateRange':
          newFilters.startDate = undefined
          newFilters.endDate = undefined
          break
        case 'hasPhotos':
          newFilters.hasPhotos = undefined
          break
        case 'sortOrder':
          newFilters.sortOrder = undefined
          break
        case 'tag':
          if (value) {
            const currentTags = newFilters.tags || []
            newFilters.tags = currentTags.filter((t) => t !== value)
            if (newFilters.tags.length === 0) {
              newFilters.tags = undefined
            }
          }
          break
      }

      onChange(newFilters)
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
      hasPhotos: undefined,
      sortOrder: undefined,
    })
  }, [onChange])

  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.searchText ||
      filters.mood ||
      filters.startDate ||
      filters.endDate ||
      filters.hasPhotos ||
      filters.sortOrder ||
      (filters.tags && filters.tags.length > 0)
    )
  }, [filters])

  const visibleTags = availableTags.slice(0, 8)
  const remainingTagsCount = availableTags.length - 8

  const getMoodLabel = (mood: Mood) => {
    const option = MOOD_OPTIONS.find((o) => o.value === mood)
    return option ? `${option.emoji} ${option.label}` : mood
  }

  const getDateRangeLabel = () => {
    if (filters.startDate && filters.endDate) {
      return `${filters.startDate} - ${filters.endDate}`
    }
    if (filters.startDate) {
      return `From ${filters.startDate}`
    }
    if (filters.endDate) {
      return `Until ${filters.endDate}`
    }
    return null
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search Row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search entries..."
            value={filters.searchText || ''}
            onChange={handleSearchChange}
            className="pl-9 pr-9"
          />
          {filters.searchText && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <Select
          value={filters.sortOrder || 'default'}
          onValueChange={handleSortChange}
        >
          <SelectTrigger className="w-[150px]">
            <ArrowUpDown className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quick Filters Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Quick Filter Chips */}
        <Button
          variant={activeQuickFilters.includes('thisWeek') ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleQuickFilterToggle('thisWeek')}
          className="h-8 text-xs"
        >
          This Week
        </Button>
        <Button
          variant={activeQuickFilters.includes('thisMonth') ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleQuickFilterToggle('thisMonth')}
          className="h-8 text-xs"
        >
          This Month
        </Button>
        <Button
          variant={activeQuickFilters.includes('hasPhotos') ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleQuickFilterToggle('hasPhotos')}
          className="h-8 text-xs gap-1"
        >
          <Image className="w-3 h-3" />
          Has Photos
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Mood Filter */}
        <Select
          value={filters.mood || 'all'}
          onValueChange={handleMoodChange}
        >
          <SelectTrigger className="w-[130px] h-8 text-xs">
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
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
              <Calendar className="w-3 h-3" />
              {filters.startDate || filters.endDate
                ? 'Custom Range'
                : 'Date Range'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Start Date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">From</label>
                  <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        {filters.startDate || 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
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
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        {filters.endDate || 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
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

              {/* Clear dates button */}
              {(filters.startDate || filters.endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    onChange({
                      ...filters,
                      startDate: undefined,
                      endDate: undefined,
                    })
                    setIsDateRangeOpen(false)
                  }}
                >
                  Clear dates
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Tags Row */}
      {availableTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Tag className="w-3 h-3" />
            Tags:
          </span>
          {visibleTags.map((tag) => {
            const isActive = filters.tags?.includes(tag)
            return (
              <Badge
                key={tag}
                variant={isActive ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/80 transition-colors"
                onClick={() => handleTagToggle(tag)}
              >
                #{tag}
              </Badge>
            )
          })}
          {remainingTagsCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setIsTagsDialogOpen(true)}
            >
              +{remainingTagsCount} more
            </Button>
          )}
        </div>
      )}

      {/* Active Filters Bar */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
          <span className="text-sm text-muted-foreground">Active:</span>

          {filters.searchText && (
            <Badge variant="secondary" className="gap-1">
              Search: &quot;{filters.searchText}&quot;
              <button
                onClick={() => handleRemoveFilter('search')}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          {filters.mood && (
            <Badge variant="secondary" className="gap-1">
              {getMoodLabel(filters.mood)}
              <button
                onClick={() => handleRemoveFilter('mood')}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          {(filters.startDate || filters.endDate) && (
            <Badge variant="secondary" className="gap-1">
              {getDateRangeLabel()}
              <button
                onClick={() => handleRemoveFilter('dateRange')}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          {filters.hasPhotos && (
            <Badge variant="secondary" className="gap-1">
              Has Photos
              <button
                onClick={() => handleRemoveFilter('hasPhotos')}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          {filters.sortOrder && (
            <Badge variant="secondary" className="gap-1">
              {filters.sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
              <button
                onClick={() => handleRemoveFilter('sortOrder')}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          {filters.tags?.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              #{tag}
              <button
                onClick={() => handleRemoveFilter('tag', tag)}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-6 text-xs text-muted-foreground hover:text-destructive ml-auto"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Tags Command Dialog */}
      <CommandDialog
        open={isTagsDialogOpen}
        onOpenChange={setIsTagsDialogOpen}
        title="Select Tags"
        description="Search and select tags to filter journal entries"
      >
        <CommandInput placeholder="Search tags..." />
        <CommandList>
          <CommandEmpty>No tags found.</CommandEmpty>
          <CommandGroup heading="Available Tags">
            {availableTags.map((tag) => {
              const isSelected = filters.tags?.includes(tag)
              return (
                <CommandItem
                  key={tag}
                  onSelect={() => handleTagToggle(tag)}
                  className="cursor-pointer"
                >
                  <div
                    className={cn(
                      'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'opacity-50 [&_svg]:invisible'
                    )}
                  >
                    <Check className="h-3 w-3" />
                  </div>
                  #{tag}
                </CommandItem>
              )
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  )
}
