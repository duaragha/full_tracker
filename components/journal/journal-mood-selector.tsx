'use client'

import { cn } from '@/lib/utils'
import { Mood } from '@/types/journal'

interface MoodOption {
  value: Mood
  emoji: string
  label: string
}

const MOOD_OPTIONS: MoodOption[] = [
  { value: 'great', emoji: '😄', label: 'Great' },
  { value: 'good', emoji: '🙂', label: 'Good' },
  { value: 'okay', emoji: '😐', label: 'Okay' },
  { value: 'bad', emoji: '😟', label: 'Bad' },
  { value: 'terrible', emoji: '😢', label: 'Terrible' },
]

interface JournalMoodSelectorProps {
  value: Mood | null
  onChange: (mood: Mood) => void
  className?: string
}

export function JournalMoodSelector({
  value,
  onChange,
  className,
}: JournalMoodSelectorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-sm text-muted-foreground mr-2">
        How are you feeling?
      </span>
      {MOOD_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          title={option.label}
          className={cn(
            'px-3 py-2 text-2xl rounded-lg border-2 transition-all hover:bg-muted',
            value === option.value
              ? 'border-primary bg-muted'
              : 'border-transparent'
          )}
        >
          {option.emoji}
        </button>
      ))}
    </div>
  )
}

// Export helper for getting mood emoji
export function getMoodEmoji(mood: Mood | undefined | null): string {
  if (!mood) return ''
  const option = MOOD_OPTIONS.find((o) => o.value === mood)
  return option?.emoji ?? ''
}

// Export helper for getting mood label
export function getMoodLabel(mood: Mood | undefined | null): string {
  if (!mood) return ''
  const option = MOOD_OPTIONS.find((o) => o.value === mood)
  return option?.label ?? ''
}

// Export mood color classes for styling
export function getMoodColorClass(mood: Mood | undefined | null): string {
  switch (mood) {
    case 'great':
      return 'text-green-500'
    case 'good':
      return 'text-emerald-500'
    case 'okay':
      return 'text-yellow-500'
    case 'bad':
      return 'text-orange-500'
    case 'terrible':
      return 'text-red-500'
    default:
      return 'text-muted-foreground'
  }
}
