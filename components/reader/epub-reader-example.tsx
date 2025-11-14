/**
 * Example usage of the EPUBReader component
 *
 * This file demonstrates how to integrate the EPUB reader into your application.
 * It shows how to:
 * - Load an EPUB file from a URL or local path
 * - Handle reading progress updates
 * - Display existing highlights
 * - Manage reader state
 */

'use client'

import { useState, useEffect } from 'react'
import { EPUBReader } from './epub-reader'
import { getHighlightsBySourceIdAction } from '@/app/actions/highlights'
import type { Highlight } from '@/types/highlight'

interface EPUBReaderPageProps {
  sourceId: number
  title: string
  fileUrl: string // Could be from S3, local server, or public URL
}

export function EPUBReaderPage({ sourceId, title, fileUrl }: EPUBReaderPageProps) {
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [isLoading, setIsLoading] = useState(true)

  /**
   * Load existing highlights for this EPUB
   */
  useEffect(() => {
    async function loadHighlights() {
      try {
        const data = await getHighlightsBySourceIdAction(sourceId)
        setHighlights(data || [])
      } catch (error) {
        console.error('Error loading highlights:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadHighlights()
  }, [sourceId])

  /**
   * Handle reading progress updates
   */
  const handleProgressUpdate = (location: string, percentage: number) => {
    console.log('Reading progress:', { location, percentage })
    // This is already handled by the EPUBReader component
    // You could add additional analytics or tracking here
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading reader...</p>
      </div>
    )
  }

  return (
    <EPUBReader
      sourceId={sourceId}
      title={title}
      fileUrl={fileUrl}
      existingHighlights={highlights.map((h) => ({
        id: h.id,
        text: h.text,
        color: h.color || 'yellow',
        location: h.location,
      }))}
      onProgressUpdate={handleProgressUpdate}
    />
  )
}

/**
 * Example: Loading EPUB from different sources
 */

// Example 1: EPUB from public URL
export function EPUBFromURL() {
  return (
    <EPUBReaderPage
      sourceId={1}
      title="Alice's Adventures in Wonderland"
      fileUrl="https://example.com/books/alice-in-wonderland.epub"
    />
  )
}

// Example 2: EPUB from S3 bucket
export function EPUBFromS3() {
  return (
    <EPUBReaderPage
      sourceId={2}
      title="Pride and Prejudice"
      fileUrl="https://your-bucket.s3.amazonaws.com/books/pride-and-prejudice.epub"
    />
  )
}

// Example 3: EPUB from local server
export function EPUBFromLocal() {
  return (
    <EPUBReaderPage
      sourceId={3}
      title="Moby Dick"
      fileUrl="/api/books/moby-dick.epub"
    />
  )
}

// Example 4: EPUB from database (file URL stored in DB)
interface BookFromDBProps {
  bookId: number
}

export function EPUBFromDatabase({ bookId }: BookFromDBProps) {
  const [bookData, setBookData] = useState<{
    sourceId: number
    title: string
    fileUrl: string
  } | null>(null)

  useEffect(() => {
    async function loadBook() {
      try {
        // Fetch book data from your API
        const response = await fetch(`/api/books/${bookId}`)
        const data = await response.json()
        setBookData(data)
      } catch (error) {
        console.error('Error loading book:', error)
      }
    }

    loadBook()
  }, [bookId])

  if (!bookData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading book...</p>
      </div>
    )
  }

  return (
    <EPUBReaderPage
      sourceId={bookData.sourceId}
      title={bookData.title}
      fileUrl={bookData.fileUrl}
    />
  )
}

/**
 * Example: EPUB reader with custom event handlers
 */
export function EPUBWithAnalytics() {
  const [readingTime, setReadingTime] = useState(0)
  const [sessionStart] = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(() => {
      setReadingTime(Math.floor((Date.now() - sessionStart) / 1000))
    }, 1000)

    return () => clearInterval(timer)
  }, [sessionStart])

  const handleProgressUpdate = async (location: string, percentage: number) => {
    // Track reading analytics
    console.log('Analytics:', {
      readingTime,
      progress: percentage,
      location,
      timestamp: new Date().toISOString(),
    })

    // Send to analytics service
    // await fetch('/api/analytics/reading', {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     sourceId: 1,
    //     progress: percentage,
    //     readingTime,
    //   }),
    // })
  }

  return (
    <div>
      <div className="fixed top-4 right-4 z-50 bg-background/80 backdrop-blur px-3 py-2 rounded-lg border text-xs">
        Reading time: {Math.floor(readingTime / 60)}m {readingTime % 60}s
      </div>
      <EPUBReaderPage
        sourceId={1}
        title="Example Book"
        fileUrl="/books/example.epub"
      />
    </div>
  )
}
