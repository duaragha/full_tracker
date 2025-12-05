'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import {
  ArrowLeft,
  Edit2,
  Trash2,
  MapPin,
  Cloud,
  Calendar,
  Clock,
  Activity,
  FileText,
  Tag,
  Hash,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { JournalEntryForm } from '@/components/journal/journal-entry-form'
import { JournalEntry, JournalEntryCreate } from '@/types/journal'
import {
  getJournalEntryAction,
  updateJournalEntryAction,
  deleteJournalEntryAction,
} from '@/lib/actions/journal'
import {
  getMoodEmoji,
  getMoodLabel,
  getMoodColorClass,
} from '@/components/journal/journal-mood-selector'

const WEATHER_LABELS: Record<string, string> = {
  sunny: 'Sunny',
  cloudy: 'Cloudy',
  rainy: 'Rainy',
  snowy: 'Snowy',
  windy: 'Windy',
  stormy: 'Stormy',
}

const WEATHER_EMOJI: Record<string, string> = {
  sunny: '☀️',
  cloudy: '☁️',
  rainy: '🌧️',
  snowy: '❄️',
  windy: '💨',
  stormy: '⛈️',
}

const ACTIVITY_LABELS: Record<string, string> = {
  working: 'Working',
  relaxing: 'Relaxing',
  exercising: 'Exercising',
  traveling: 'Traveling',
  eating: 'Eating',
}

const ACTIVITY_EMOJI: Record<string, string> = {
  working: '💼',
  relaxing: '🛋️',
  exercising: '🏃',
  traveling: '✈️',
  eating: '🍽️',
}

export default function JournalEntryPage() {
  const router = useRouter()
  const params = useParams()
  const id = Number(params.id)

  const [entry, setEntry] = useState<JournalEntry | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadEntry = useCallback(async () => {
    if (!id || isNaN(id)) {
      setError('Invalid entry ID')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const fetchedEntry = await getJournalEntryAction(id)
      setEntry(fetchedEntry)
    } catch (err) {
      console.error('Failed to load entry:', err)
      setError('Failed to load journal entry')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadEntry()
  }, [loadEntry])

  const handleUpdate = async (data: JournalEntryCreate) => {
    if (!entry) return

    setIsSaving(true)
    setError(null)

    try {
      const updatedEntry = await updateJournalEntryAction(entry.id, {
        title: data.title,
        content: data.content,
        entryDate: data.entryDate,
        entryTime: data.entryTime,
        mood: data.mood,
        weather: data.weather,
        location: data.location,
        activity: data.activity,
        tagNames: data.tagNames,
      })
      setEntry(updatedEntry)
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to update entry:', err)
      setError('Failed to update entry. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!entry) return

    setIsDeleting(true)
    try {
      await deleteJournalEntryAction(entry.id)
      router.push('/journal')
    } catch (err) {
      console.error('Failed to delete entry:', err)
      setError('Failed to delete entry. Please try again.')
      setIsDeleting(false)
    }
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button asChild variant="ghost" size="icon">
            <Link href="/journal">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        </div>
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <Card>
              <CardContent className="py-12">
                <div className="space-y-4">
                  <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-full bg-muted animate-pulse rounded" />
                  <div className="h-4 w-full bg-muted animate-pulse rounded" />
                  <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          </div>
          <aside className="w-full lg:w-72 shrink-0 space-y-4">
            <Card>
              <CardContent className="py-6">
                <div className="h-4 w-full bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    )
  }

  // Error State
  if (error || !entry) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button asChild variant="ghost" size="icon">
            <Link href="/journal">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Entry Not Found</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {error || 'This entry could not be found.'}
            </p>
            <Button asChild>
              <Link href="/journal">Return to Journal</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Edit Mode
  if (isEditing) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Edit Entry
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Update your journal entry
            </p>
          </div>
        </div>

        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="pt-4 text-destructive text-sm">
              {error}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6">
            <JournalEntryForm
              entry={entry}
              onSubmit={handleUpdate}
              onCancel={() => setIsEditing(false)}
              isLoading={isSaving}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  // View Mode
  const formattedDate = format(parseISO(entry.entryDate), 'EEEE, MMMM d, yyyy')
  const formattedCreatedAt = format(parseISO(entry.createdAt), 'MMM d, yyyy h:mm a')
  const formattedUpdatedAt = format(parseISO(entry.updatedAt), 'MMM d, yyyy h:mm a')
  const hasLocationOrWeather = entry.location || entry.weather
  const hasActivity = entry.activity
  const hasTags = entry.tags.length > 0

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <Button asChild variant="ghost" size="icon" className="shrink-0 mt-1">
            <Link href="/journal">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">
              {entry.title || 'Untitled Entry'}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mt-2">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formattedDate}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {entry.entryTime}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:shrink-0 ml-12 sm:ml-0">
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Edit2 className="h-4 w-4 mr-1.5" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your
                  journal entry and all its data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Entry'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content Area */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Mood Badge - Prominent Display */}
          {entry.mood && (
            <div className="flex items-center gap-3">
              <span className="text-4xl">{getMoodEmoji(entry.mood)}</span>
              <div>
                <p className="text-sm text-muted-foreground">Feeling</p>
                <p className={`text-lg font-medium ${getMoodColorClass(entry.mood)}`}>
                  {getMoodLabel(entry.mood)}
                </p>
              </div>
            </div>
          )}

          {/* Content Card */}
          <Card>
            <CardContent className="pt-6 pb-8">
              <article className="prose prose-lg dark:prose-invert max-w-none">
                {entry.content.split('\n').map((paragraph, index) => (
                  <p
                    key={index}
                    className="mb-4 last:mb-0 leading-relaxed text-foreground"
                  >
                    {paragraph || <br />}
                  </p>
                ))}
              </article>
              <Separator className="my-6" />
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                {entry.wordCount} {entry.wordCount === 1 ? 'word' : 'words'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-72 shrink-0 space-y-4">
          {/* Details Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formattedCreatedAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{formattedUpdatedAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Words</span>
                <span>{entry.wordCount}</span>
              </div>
            </CardContent>
          </Card>

          {/* Location & Weather Card */}
          {hasLocationOrWeather && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location & Weather
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {entry.location && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>{entry.location}</span>
                  </div>
                )}
                {entry.weather && (
                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>
                      {WEATHER_EMOJI[entry.weather]}{' '}
                      {WEATHER_LABELS[entry.weather] || entry.weather}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Activity Card */}
          {hasActivity && entry.activity && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {ACTIVITY_EMOJI[entry.activity]}
                  </span>
                  <span>{ACTIVITY_LABELS[entry.activity] || entry.activity}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tags Card */}
          {hasTags && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {entry.tags.map((tag) => (
                    <Badge key={tag.id} variant="secondary" className="gap-1">
                      <Hash className="h-3 w-3" />
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  )
}
