'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  MapPin,
  Cloud,
  Zap,
  Paperclip,
  FileText,
  Activity as ActivityIcon,
  Image,
  Plus,
  Footprints,
  Moon,
  Scale,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Weather, Activity } from '@/types/journal'
import { cn } from '@/lib/utils'
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

const QUICK_TEMPLATES = [
  {
    id: 'daily-reflection',
    title: 'Daily Reflection',
    description: 'Gratitude, highlights, learnings',
  },
  {
    id: 'work-log',
    title: 'Work Log',
    description: 'Tasks, meetings, blockers',
  },
  {
    id: 'workout-notes',
    title: 'Workout Notes',
    description: 'Exercises, sets, feelings',
  },
]

interface JournalEntrySidebarProps {
  location: string
  onLocationChange: (value: string) => void
  weather: Weather | undefined
  onWeatherChange: (value: Weather) => void
  activity: Activity | undefined
  onActivityChange: (value: Activity) => void
  temperature?: number | null
  onTemperatureChange?: (value: number | null) => void
  onTemplateSelect?: (templateId: string) => void
  className?: string
}

export function JournalEntrySidebar({
  location,
  onLocationChange,
  weather,
  onWeatherChange,
  activity,
  onActivityChange,
  temperature,
  onTemperatureChange,
  onTemplateSelect,
  className,
}: JournalEntrySidebarProps) {
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
        onWeatherChange(result.weather)
        onTemperatureChange?.(result.temperature)
      } else {
        setWeatherError('Location not found')
      }
    } catch {
      setWeatherError('Could not fetch weather')
    } finally {
      setIsLoadingWeather(false)
    }
  }, [onWeatherChange, onTemperatureChange])

  // Debounced weather fetch when location changes
  useEffect(() => {
    if (!location || location.length < 2) {
      // Clear weather and temperature when location is cleared
      if (!location) {
        onTemperatureChange?.(null)
      }
      return
    }

    const timer = setTimeout(() => {
      fetchWeather(location)
    }, 800)

    return () => clearTimeout(timer)
  }, [location, fetchWeather, onTemperatureChange])

  const handleRefreshWeather = useCallback(() => {
    if (location && location.length >= 2) {
      fetchWeather(location)
    }
  }, [location, fetchWeather])

  const handleTemplateClick = (templateId: string) => {
    if (onTemplateSelect) {
      onTemplateSelect(templateId)
    }
  }

  // Get display text for weather select trigger
  const getWeatherDisplayValue = () => {
    if (!weather) return undefined
    const option = WEATHER_OPTIONS.find((opt) => opt.value === weather)
    if (!option) return undefined
    return `${option.emoji} ${option.label}`
  }

  return (
    <aside className={cn("w-72 border-l p-4 space-y-6 hidden lg:block", className)}>
      {/* Metadata Section */}
      <div>
        <h3 className="text-sm font-medium mb-3">Metadata</h3>
        <div className="space-y-3">
          {/* Location */}
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Input
              type="text"
              placeholder="Add location..."
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* Weather with temperature */}
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 flex items-center gap-2">
              <Select
                value={weather}
                onValueChange={(val) => onWeatherChange(val as Weather)}
              >
                <SelectTrigger className="h-8 text-sm flex-1">
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
              {isLoadingWeather && (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0" />
              )}
              {!isLoadingWeather && temperature !== undefined && temperature !== null && (
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {temperature}°C
                </span>
              )}
              {location && !isLoadingWeather && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={handleRefreshWeather}
                  title="Refresh weather"
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Weather error message */}
          {weatherError && (
            <div className="flex items-center gap-2 text-xs text-destructive ml-6">
              <AlertCircle className="w-3 h-3" />
              <span>{weatherError}</span>
            </div>
          )}

          {/* Activity */}
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Select
              value={activity}
              onValueChange={(val) => onActivityChange(val as Activity)}
            >
              <SelectTrigger className="h-8 text-sm">
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
      </div>

      {/* Today's Health Stats */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <ActivityIcon className="w-4 h-4" />
          Today&apos;s Health Stats
        </h3>
        <Card className="border-dashed">
          <CardContent className="p-3 space-y-2">
            <p className="text-xs text-muted-foreground text-center mb-2">
              (Coming soon)
            </p>

            {/* Steps */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Footprints className="w-3.5 h-3.5" />
                Steps
              </span>
              <span className="text-muted-foreground">—</span>
            </div>

            {/* Sleep */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Moon className="w-3.5 h-3.5" />
                Sleep
              </span>
              <span className="text-muted-foreground">—</span>
            </div>

            {/* Weight */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Scale className="w-3.5 h-3.5" />
                Weight
              </span>
              <span className="text-muted-foreground">—</span>
            </div>

            {/* Attach button */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground mt-2 pt-2 border-t border-dashed h-auto py-2"
              disabled
            >
              <Plus className="w-3 h-3 mr-1" />
              Attach to entry
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Attachments */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Paperclip className="w-4 h-4" />
          Attachments
        </h3>

        {/* Placeholder grid for future attached images */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          {/* Empty state - will show attached images in the future */}
        </div>

        {/* Add photo/file button */}
        <Button
          variant="outline"
          className="w-full h-20 border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors"
          disabled
        >
          <Image className="w-5 h-5" />
          <span className="text-xs">Add photo or file</span>
          <span className="text-[10px] text-muted-foreground/70">(Coming soon)</span>
        </Button>
      </div>

      {/* Quick Templates */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Quick Templates
        </h3>
        <div className="space-y-2">
          {QUICK_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => handleTemplateClick(template.id)}
              className="w-full text-left p-3 rounded-lg border bg-muted/50 hover:bg-muted hover:border-foreground/20 transition-colors cursor-pointer group"
            >
              <div className="text-sm font-medium group-hover:text-foreground">
                {template.title}
              </div>
              <div className="text-xs text-muted-foreground">
                {template.description}
              </div>
            </button>
          ))}
          <p className="text-[10px] text-muted-foreground text-center pt-1">
            Click to insert template (coming soon)
          </p>
        </div>
      </div>
    </aside>
  )
}
