'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { JournalEntryForm } from '@/components/journal/journal-entry-form'
import { JournalEntryCreate } from '@/types/journal'
import { createJournalEntryAction } from '@/lib/actions/journal'

export default function NewJournalEntryPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (data: JournalEntryCreate) => {
    setIsLoading(true)
    setError(null)

    try {
      await createJournalEntryAction(data)
      router.push('/journal')
    } catch (err) {
      console.error('Failed to create entry:', err)
      setError('Failed to save your entry. Please try again.')
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/journal')
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/journal">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">New Entry</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
            Capture your thoughts and reflections
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-4 text-destructive text-sm">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Entry Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Write Your Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <JournalEntryForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  )
}
