'use client'

import { useState, useCallback, useEffect } from 'react'
import { format } from 'date-fns'
import {
  X,
  Plus,
  MapPin,
  Cloud,
  Zap,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
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
import {
  JournalEntry,
  JournalEntryCreate,
  Mood,
  Weather,
  Activity,
} from '@/types/journal'
import { JournalMoodSelector } from './journal-mood-selector'
import { JournalEntrySidebar } from './journal-entry-sidebar'
import { getWeatherForLocationAction } from '@/lib/actions/weather'

const WEATHER_EMOJI: Record<Weather, string> = {
  sunny: '\u2600\uFE0F',
  cloudy: '\u2601\uFE0F',
  rainy: '\uD83C\uDF27\uFE0F',
  snowy: '\u2744\uFE0F',
  windy: '\uD83D\uDCA8',
  stormy: '\u26C8\uFE0F',
}

const WEATHER_OPTIONS: { value: Weather; label: string; emoji: string }[] = [
  { value: 'sunny', label: 'Sunny', emoji: WEATHER_EMOJI.sunny },
  { value: 'cloudy', label: 'Cloudy', emoji: WEATHER_EMOJI.cloudy },
  { value: 'rainy', label: 'Rainy', emoji: WEATHER_EMOJI.rainy },
  { value: 'snowy', label: 'Snowy', emoji: WEATHER_EMOJI.snowy },
  { value: 'windy', label: 'Windy', emoji: WEATHER_EMOJI.windy },
  { value: 'stormy', label: 'Stormy', emoji: WEATHER_EMOJI.stormy },
]

const ACTIVITY_OPTIONS: { value: Activity; label: string }[] = [
  { value: 'working', label: 'Working' },
  { value: 'relaxing', label: 'Relaxing' },
  { value: 'exercising', label: 'Exercising' },
  { value: 'traveling', label: 'Traveling' },
  { value: 'eating', label: 'Eating' },
]

interface JournalEntryEditorProps {
  entry?: JournalEntry
  onSubmit: (data: JournalEntryCreate) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function JournalEntryEditor({
  entry,
  onSubmit,
  onCancel,
  isLoading = false,
}: JournalEntryEditorProps) {
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
  const [temperature, setTemperature] = useState<number | null>(null)
  const [tags, setTags] = useState<string[]>(
    entry?.tags.map((t) => t.name) ?? []
  )
  const [tagInput, setTagInput] = useState('')

  // Weather loading state for mobile view
  const [isLoadingWeather, setIsLoadingWeather] = useState(false)
  const [weatherError, setWeatherError] = useState<string | null>(null)

  const fetchWeather = useCallback(async (locationToFetch: string) => {
    if (!locationToFetch || locationToFetch.length < 2) {
      return
    }

    setIsLoadingWeather(true)
    setWeatherError(null)

    try {
      const result = await getWeatherForLocationAction(locationToFetch)
      if (result) {
        setWeather(result.weather)
        setTemperature(result.temperature)
      } else {
        setWeatherError('Location not found')
      }
    } catch {
      setWeatherError('Could not fetch weather')
    } finally {
      setIsLoadingWeather(false)
    }
  }, [])

  // Debounced weather fetch when location changes (for mobile view)
  // Note: The sidebar component handles its own debouncing for desktop
  useEffect(() => {
    // Only run for mobile view - the sidebar handles desktop
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      return
    }

    if (!location || location.length < 2) {
      if (!location) {
        setTemperature(null)
      }
      return
    }

    const timer = setTimeout(() => {
      fetchWeather(location)
    }, 800)

    return () => clearTimeout(timer)
  }, [location, fetchWeather])

  const handleRefreshWeather = useCallback(() => {
    if (location && location.length >= 2) {
      fetchWeather(location)
    }
  }, [location, fetchWeather])

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

  // Get display text for weather select trigger
  const getWeatherDisplayValue = () => {
    if (!weather) return undefined
    const option = WEATHER_OPTIONS.find((opt) => opt.value === weather)
    if (!option) return undefined
    return `${option.emoji} ${option.label}`
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row">
          {/* Main Editor Area */}
          <form onSubmit={handleSubmit} className="flex-1 space-y-6">
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

        {/* Metadata Row - visible only on mobile/tablet */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:hidden">
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
              {isLoadingWeather && (
                <Loader2 className="w-3 h-3 animate-spin ml-1" />
              )}
            </Label>
            <div className="flex items-center gap-2">
              <Select
                value={weather}
                onValueChange={(val) => setWeather(val as Weather)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select weather...">
                    {getWeatherDisplayValue()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {WEATHER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.emoji} {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isLoadingWeather && temperature !== null && (
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {temperature}°C
                </span>
              )}
              {location && !isLoadingWeather && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={handleRefreshWeather}
                  title="Refresh weather"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}
            </div>
            {weatherError && (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="w-3 h-3" />
                <span>{weatherError}</span>
              </div>
            )}
          </div>

          {/* Activity */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-1">
              <Zap className="w-4 h-4" />
              Activity
            </Label>
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

      {/* Right Sidebar - visible only on desktop */}
      <JournalEntrySidebar
        location={location}
        onLocationChange={setLocation}
        weather={weather}
        onWeatherChange={setWeather}
        activity={activity}
        onActivityChange={setActivity}
        temperature={temperature}
        onTemperatureChange={setTemperature}
        className="flex-shrink-0"
      />
      </div>
      </div>
    </div>
  )
}
