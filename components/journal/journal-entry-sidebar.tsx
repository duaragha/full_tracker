'use client'

import { MapPin, Cloud, Zap, Paperclip, FileText, Activity as ActivityIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Weather, Activity } from '@/types/journal'

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

interface JournalEntrySidebarProps {
  location: string
  onLocationChange: (value: string) => void
  weather: Weather | undefined
  onWeatherChange: (value: Weather) => void
  activity: Activity | undefined
  onActivityChange: (value: Activity) => void
}

export function JournalEntrySidebar({
  location,
  onLocationChange,
  weather,
  onWeatherChange,
  activity,
  onActivityChange,
}: JournalEntrySidebarProps) {
  return (
    <aside className="w-72 border-l p-4 space-y-6 hidden lg:block">
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

          {/* Weather */}
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Select
              value={weather}
              onValueChange={(val) => onWeatherChange(val as Weather)}
            >
              <SelectTrigger className="h-8 text-sm">
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

      {/* Today's Health Stats - Placeholder */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <ActivityIcon className="w-4 h-4" />
          Today&apos;s Health Stats
        </h3>
        <Card className="py-3">
          <CardContent className="px-3 py-0">
            <p className="text-xs text-muted-foreground text-center">
              Coming soon
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Attachments - Placeholder */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Paperclip className="w-4 h-4" />
          Attachments
        </h3>
        <Card className="py-3 border-dashed">
          <CardContent className="px-3 py-0">
            <p className="text-xs text-muted-foreground text-center">
              Coming soon
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Templates - Placeholder */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Quick Templates
        </h3>
        <Card className="py-3">
          <CardContent className="px-3 py-0">
            <p className="text-xs text-muted-foreground text-center">
              Coming soon
            </p>
          </CardContent>
        </Card>
      </div>
    </aside>
  )
}
