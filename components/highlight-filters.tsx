'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Calendar } from '@/components/ui/calendar'
import { Filter, X, Calendar as CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { HighlightTag, SourceType } from '@/types/highlight'

interface HighlightFiltersProps {
  tags: HighlightTag[]
  onFilterChange?: (filters: FilterState) => void
  initialFilters?: FilterState
}

export interface FilterState {
  sourceType?: SourceType
  tagIds?: number[]
  hasNotes?: boolean
  color?: string
  startDate?: Date
  endDate?: Date
}

const SOURCE_TYPE_OPTIONS: { value: SourceType; label: string }[] = [
  { value: 'kindle', label: 'Kindle' },
  { value: 'book', label: 'Book' },
  { value: 'web_article', label: 'Web Article' },
  { value: 'pdf', label: 'PDF' },
  { value: 'manual', label: 'Manual' },
]

const COLOR_OPTIONS = [
  { value: 'yellow', label: 'Yellow', color: 'bg-yellow-200' },
  { value: 'blue', label: 'Blue', color: 'bg-blue-200' },
  { value: 'green', label: 'Green', color: 'bg-green-200' },
  { value: 'pink', label: 'Pink', color: 'bg-pink-200' },
  { value: 'orange', label: 'Orange', color: 'bg-orange-200' },
]

export function HighlightFilters({
  tags,
  onFilterChange,
  initialFilters = {},
}: HighlightFiltersProps) {
  const [filters, setFilters] = useState<FilterState>(initialFilters)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilters = (updates: Partial<FilterState>) => {
    const newFilters = { ...filters, ...updates }
    setFilters(newFilters)

    if (onFilterChange) {
      onFilterChange(newFilters)
    } else {
      // Update URL when no callback provided
      const params = new URLSearchParams(searchParams?.toString())

      // Update/remove source type
      if (newFilters.sourceType) {
        params.set('sourceType', newFilters.sourceType)
      } else {
        params.delete('sourceType')
      }

      // Update/remove tag IDs
      if (newFilters.tagIds && newFilters.tagIds.length > 0) {
        params.set('tagIds', newFilters.tagIds.join(','))
      } else {
        params.delete('tagIds')
      }

      // Update/remove has notes
      if (newFilters.hasNotes) {
        params.set('hasNotes', 'true')
      } else {
        params.delete('hasNotes')
      }

      // Update/remove color
      if (newFilters.color) {
        params.set('color', newFilters.color)
      } else {
        params.delete('color')
      }

      // Update/remove dates
      if (newFilters.startDate) {
        params.set('startDate', newFilters.startDate.toISOString().split('T')[0])
      } else {
        params.delete('startDate')
      }

      if (newFilters.endDate) {
        params.set('endDate', newFilters.endDate.toISOString().split('T')[0])
      } else {
        params.delete('endDate')
      }

      router.push(`?${params.toString()}`)
    }
  }

  const clearFilters = () => {
    setFilters({})

    if (onFilterChange) {
      onFilterChange({})
    } else {
      // Clear URL params
      const params = new URLSearchParams(searchParams?.toString())
      params.delete('sourceType')
      params.delete('tagIds')
      params.delete('hasNotes')
      params.delete('color')
      params.delete('startDate')
      params.delete('endDate')
      router.push(`?${params.toString()}`)
    }
  }

  const toggleTag = (tagId: number) => {
    const currentTags = filters.tagIds || []
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId]
    updateFilters({ tagIds: newTags.length > 0 ? newTags : undefined })
  }

  const activeFilterCount = Object.keys(filters).filter(key => {
    const value = filters[key as keyof FilterState]
    if (Array.isArray(value)) return value.length > 0
    return value !== undefined
  }).length

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-4" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Filters</h4>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-7 text-xs"
                >
                  Clear all
                </Button>
              )}
            </div>

            {/* Source Type */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Source Type</Label>
              <Select
                value={filters.sourceType || 'all'}
                onValueChange={(value) =>
                  updateFilters({ sourceType: value === 'all' ? undefined : (value as SourceType) })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  {SOURCE_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">Tags</Label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {tags.map((tag) => {
                    const isSelected = filters.tagIds?.includes(tag.id)
                    return (
                      <Badge
                        key={tag.id}
                        variant={isSelected ? 'default' : 'outline'}
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => toggleTag(tag.id)}
                        style={
                          isSelected && tag.color
                            ? { backgroundColor: tag.color, color: 'white' }
                            : {}
                        }
                      >
                        {tag.name}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Has Notes */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has-notes"
                checked={filters.hasNotes === true}
                onCheckedChange={(checked) =>
                  updateFilters({ hasNotes: checked ? true : undefined })
                }
              />
              <Label
                htmlFor="has-notes"
                className="text-sm font-normal cursor-pointer"
              >
                Only highlights with notes
              </Label>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Highlight Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((color) => {
                  const isSelected = filters.color === color.value
                  return (
                    <button
                      key={color.value}
                      onClick={() =>
                        updateFilters({
                          color: isSelected ? undefined : color.value,
                        })
                      }
                      className={`
                        px-3 py-1.5 rounded-md text-xs font-medium
                        ${color.color} hover:opacity-80 transition-opacity
                        ${isSelected ? 'ring-2 ring-primary' : ''}
                      `}
                    >
                      {color.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Date Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {filters.startDate ? (
                        format(filters.startDate, 'PP')
                      ) : (
                        <span className="text-muted-foreground text-xs">From</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.startDate}
                      onSelect={(date) => updateFilters({ startDate: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {filters.endDate ? (
                        format(filters.endDate, 'PP')
                      ) : (
                        <span className="text-muted-foreground text-xs">To</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.endDate}
                      onSelect={(date) => updateFilters({ endDate: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              {(filters.startDate || filters.endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateFilters({ startDate: undefined, endDate: undefined })}
                  className="h-7 w-full text-xs"
                >
                  Clear dates
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filter badges */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {filters.sourceType && (
            <Badge variant="secondary" className="h-7">
              {SOURCE_TYPE_OPTIONS.find(o => o.value === filters.sourceType)?.label}
              <button
                onClick={() => updateFilters({ sourceType: undefined })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.tagIds?.map(tagId => {
            const tag = tags.find(t => t.id === tagId)
            return tag ? (
              <Badge key={tagId} variant="secondary" className="h-7">
                {tag.name}
                <button
                  onClick={() => toggleTag(tagId)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : null
          })}
          {filters.hasNotes && (
            <Badge variant="secondary" className="h-7">
              Has notes
              <button
                onClick={() => updateFilters({ hasNotes: undefined })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.color && (
            <Badge variant="secondary" className="h-7">
              {COLOR_OPTIONS.find(c => c.value === filters.color)?.label}
              <button
                onClick={() => updateFilters({ color: undefined })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
