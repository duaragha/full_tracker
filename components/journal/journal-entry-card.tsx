'use client'

import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { MapPin, Cloud, Sun, CloudRain, Snowflake, Wind, CloudLightning } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { JournalEntry, Weather } from '@/types/journal'
import { getMoodEmoji } from './journal-mood-selector'

interface JournalEntryCardProps {
  entry: JournalEntry
  onClick?: () => void
  className?: string
}

function getWeatherIcon(weather: Weather | undefined) {
  switch (weather) {
    case 'sunny':
      return <Sun className="w-3 h-3" />
    case 'cloudy':
      return <Cloud className="w-3 h-3" />
    case 'rainy':
      return <CloudRain className="w-3 h-3" />
    case 'snowy':
      return <Snowflake className="w-3 h-3" />
    case 'windy':
      return <Wind className="w-3 h-3" />
    case 'stormy':
      return <CloudLightning className="w-3 h-3" />
    default:
      return null
  }
}

function formatEntryDate(dateStr: string): { day: string; weekday: string } {
  const date = parseISO(dateStr)
  return {
    day: format(date, 'd'),
    weekday: format(date, 'EEE'),
  }
}

export function JournalEntryCard({
  entry,
  onClick,
  className,
}: JournalEntryCardProps) {
  const { day, weekday } = formatEntryDate(entry.entryDate)
  const moodEmoji = getMoodEmoji(entry.mood)
  const weatherIcon = getWeatherIcon(entry.weather)

  // Truncate content for preview
  const truncatedContent = entry.content.length > 200
    ? entry.content.slice(0, 200) + '...'
    : entry.content

  return (
    <Card
      className={cn(
        'p-4 hover:bg-muted/50 cursor-pointer transition-colors',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        {/* Date Column */}
        <div className="text-center min-w-[50px]">
          <div className="text-2xl font-bold">{day}</div>
          <div className="text-xs text-muted-foreground">{weekday}</div>
        </div>

        {/* Content Column */}
        <div className="flex-1 min-w-0">
          {/* Title & Mood */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg font-medium truncate">
              {entry.title || 'Untitled Entry'}
            </span>
            {moodEmoji && (
              <span className="text-xl" title={entry.mood}>
                {moodEmoji}
              </span>
            )}
          </div>

          {/* Content Preview */}
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
            {truncatedContent}
          </p>

          {/* Tags & Metadata */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Tags */}
            {entry.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="text-xs"
              >
                #{tag.name}
              </Badge>
            ))}
            {entry.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{entry.tags.length - 3} more
              </span>
            )}

            {/* Location */}
            {entry.location && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                <MapPin className="w-3 h-3" />
                {entry.location}
              </div>
            )}

            {/* Weather */}
            {weatherIcon && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {weatherIcon}
                <span className="capitalize">{entry.weather}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
