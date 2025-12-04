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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { getMoodEmoji, getMoodLabel } from '@/components/journal/journal-mood-selector'

const WEATHER_LABELS: Record<string, string> = {
  sunny: 'Sunny',
  cloudy: 'Cloudy',
  rainy: 'Rainy',
  snowy: 'Snowy',
  windy: 'Windy',
  stormy: 'Stormy',
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

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/journal">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading entry...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !entry) {
    return (
      <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/journal">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Entry Not Found</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">{error || 'This entry could not be found.'}</p>
            <Button asChild>
              <Link href="/journal">Return to Journal</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsEditing(false)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Edit Entry</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
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

  const formattedDate = format(parseISO(entry.entryDate), 'EEEE, MMMM d, yyyy')
  const formattedTime = entry.entryTime

  return (
    <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/journal">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {entry.title || 'Untitled Entry'}
            </h1>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mt-0.5">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>{formattedDate}</span>
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 ml-2" />
              <span>{formattedTime}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <Edit2 className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-1" />
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

      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-3">
        {entry.mood && (
          <Badge variant="secondary" className="text-base py-1 px-3">
            {getMoodEmoji(entry.mood)} {getMoodLabel(entry.mood)}
          </Badge>
        )}
        {entry.weather && (
          <Badge variant="outline" className="gap-1">
            <Cloud className="h-3 w-3" />
            {WEATHER_LABELS[entry.weather] || entry.weather}
          </Badge>
        )}
        {entry.location && (
          <Badge variant="outline" className="gap-1">
            <MapPin className="h-3 w-3" />
            {entry.location}
          </Badge>
        )}
        {entry.activity && (
          <Badge variant="outline" className="capitalize">
            {entry.activity}
          </Badge>
        )}
      </div>

      {/* Tags */}
      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {entry.tags.map((tag) => (
            <Badge key={tag.id} variant="secondary">
              #{tag.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Content */}
      <Card>
        <CardContent className="pt-6">
          <div className="prose dark:prose-invert max-w-none">
            {entry.content.split('\n').map((paragraph, index) => (
              <p key={index} className="mb-4 last:mb-0 leading-relaxed">
                {paragraph || <br />}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Word Count */}
      <p className="text-sm text-muted-foreground text-center">
        {entry.wordCount} words
      </p>
    </div>
  )
}
