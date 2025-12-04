'use client'

import { useState, useCallback } from 'react'
import { format } from 'date-fns'
import { X, Plus, MapPin, Cloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  JournalEntry,
  JournalEntryCreate,
  Mood,
  Weather,
  Activity,
} from '@/types/journal'
import { JournalMoodSelector } from './journal-mood-selector'

const WEATHER_OPTIONS: { value: Weather; label: string }[] = [
  { value: 'sunny', label: 'Sunny' },
  { value: 'cloudy', label: 'Cloudy' },
  { value: 'rainy', label: 'Rainy' },
  { value: 'snowy', label: 'Snowy' },
  { value: 'windy', label: 'Windy' },
  { value: 'stormy', label: 'Stormy' },
]

const ACTIVITY_OPTIONS: { value: Activity; label: string }[] = [
  { value: 'working', label: 'Working' },
  { value: 'relaxing', label: 'Relaxing' },
  { value: 'exercising', label: 'Exercising' },
  { value: 'traveling', label: 'Traveling' },
  { value: 'eating', label: 'Eating' },
]

interface JournalEntryFormProps {
  entry?: JournalEntry
  onSubmit: (data: JournalEntryCreate) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  className?: string
}

export function JournalEntryForm({
  entry,
  onSubmit,
  onCancel,
  isLoading = false,
  className,
}: JournalEntryFormProps) {
  // Form state
  const [title, setTitle] = useState(entry?.title ?? '')
  const [content, setContent] = useState(entry?.content ?? '')
  const [entryDate, setEntryDate] = useState(
    entry?.entryDate ?? format(new Date(), 'yyyy-MM-dd')
  )
  const [entryTime, setEntryTime] = useState(
    entry?.entryTime ?? format(new Date(), 'HH:mm')
  )
  const [mood, setMood] = useState<Mood | null>(entry?.mood ?? null)
  const [weather, setWeather] = useState<Weather | undefined>(entry?.weather)
  const [location, setLocation] = useState(entry?.location ?? '')
  const [activity, setActivity] = useState<Activity | undefined>(entry?.activity)
  const [tags, setTags] = useState<string[]>(
    entry?.tags.map((t) => t.name) ?? []
  )
  const [tagInput, setTagInput] = useState('')

  const handleAddTag = useCallback(() => {
    const trimmedTag = tagInput.trim().toLowerCase().replace(/^#/, '')
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags((prev) => [...prev, trimmedTag])
      setTagInput('')
    }
  }, [tagInput, tags])

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove))
  }, [])

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const data: JournalEntryCreate = {
      title,
      content,
      entryDate,
      entryTime,
      mood: mood ?? undefined,
      weather,
      location: location || undefined,
      activity,
      tagNames: tags.length > 0 ? tags : undefined,
    }

    await onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {/* Date & Time */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="w-auto"
          />
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="time"
            value={entryTime}
            onChange={(e) => setEntryTime(e.target.value)}
            className="w-auto"
          />
        </div>
      </div>

      {/* Title */}
      <div>
        <Input
          type="text"
          placeholder="Entry title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-xl font-semibold border-none shadow-none focus-visible:ring-0 px-0 h-auto py-2"
        />
      </div>

      {/* Mood Selector */}
      <JournalMoodSelector value={mood} onChange={setMood} />

      {/* Content */}
      <div>
        <Textarea
          placeholder="What's on your mind today?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[300px] resize-none text-base leading-relaxed"
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Tags</Label>
        <div className="flex items-center gap-2 flex-wrap">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="gap-1 pr-1"
            >
              #{tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          <div className="flex items-center gap-1">
            <Input
              type="text"
              placeholder="Add tag..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagInputKeyDown}
              onBlur={handleAddTag}
              className="w-32 h-7 text-sm"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleAddTag}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Metadata Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Location */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            Location
          </Label>
          <Input
            type="text"
            placeholder="Add location..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        {/* Weather */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground flex items-center gap-1">
            <Cloud className="w-4 h-4" />
            Weather
          </Label>
          <Select
            value={weather}
            onValueChange={(val) => setWeather(val as Weather)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select weather..." />
            </SelectTrigger>
            <SelectContent>
              {WEATHER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Activity */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Activity</Label>
          <Select
            value={activity}
            onValueChange={(val) => setActivity(val as Activity)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select activity..." />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isLoading}
        >
          Discard
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : entry ? 'Update Entry' : 'Save Entry'}
        </Button>
      </div>
    </form>
  )
}
