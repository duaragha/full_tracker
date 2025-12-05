'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { JournalEntryEditor } from '@/components/journal/journal-entry-editor'
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="h-14 border-b flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/journal">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="w-px h-4 bg-border" />
          <span className="text-sm text-muted-foreground">New Entry</span>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="px-4 pt-4">
          <Card className="border-destructive bg-destructive/10 max-w-4xl">
            <CardContent className="pt-4 text-destructive text-sm">
              {error}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Editor with Sidebar Layout */}
      <JournalEntryEditor
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  )
}
