'use client'

/**
 * Example usage of PDFReader component
 * This file demonstrates various ways to integrate the PDF reader
 */

import { useState, useEffect } from 'react'
import { PDFReader } from './pdf-reader'
import { getSourceByIdAction, getHighlightsAction } from '@/app/actions/highlights'
import { Loader2 } from 'lucide-react'

// Example 1: Basic PDF Reader with Static Data
export function BasicPDFReaderExample() {
  return (
    <PDFReader
      sourceId={1}
      title="Sample PDF Document"
      fileUrl="/samples/document.pdf"
    />
  )
}

// Example 2: PDF Reader with Existing Highlights
export function PDFReaderWithHighlightsExample() {
  const existingHighlights = [
    {
      id: 1,
      text: 'This is an important highlight from page 1',
      color: 'yellow',
      location: {
        page: 1,
        startOffset: 100,
        endOffset: 145,
        boundingRect: {
          top: 200,
          left: 50,
          width: 400,
          height: 24,
        },
      },
    },
    {
      id: 2,
      text: 'Another key point on page 2',
      color: 'green',
      location: {
        page: 2,
        startOffset: 500,
        endOffset: 528,
        boundingRect: {
          top: 350,
          left: 80,
          width: 350,
          height: 20,
        },
      },
    },
  ]

  return (
    <PDFReader
      sourceId={1}
      title="PDF with Highlights"
      fileUrl="/samples/document.pdf"
      existingHighlights={existingHighlights}
      onProgressUpdate={(page, total) => {
        console.log(`Reading progress: ${page}/${total} (${Math.round((page / total) * 100)}%)`)
      }}
    />
  )
}

// Example 3: Dynamic PDF Reader with Database Integration
export function DynamicPDFReaderExample({ sourceId }: { sourceId: number }) {
  const [source, setSource] = useState<any>(null)
  const [highlights, setHighlights] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadPDFData() {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch source data
        const sourceData = await getSourceByIdAction(sourceId)
        if (!sourceData) {
          throw new Error('Source not found')
        }

        // Verify it's a PDF source
        if (sourceData.sourceType !== 'pdf') {
          throw new Error('Source is not a PDF document')
        }

        setSource(sourceData)

        // Fetch highlights for this source
        const highlightsData = await getHighlightsAction({
          sourceId: sourceId,
          limit: 1000, // Get all highlights
        })

        // Transform highlights to match PDFReader format
        const transformedHighlights = highlightsData
          .filter((h) => h.location && typeof h.location === 'object' && 'page' in h.location)
          .map((h) => ({
            id: h.id,
            text: h.text,
            color: h.color || 'yellow',
            location: h.location,
          }))

        setHighlights(transformedHighlights)
      } catch (err) {
        console.error('Error loading PDF data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load PDF')
      } finally {
        setIsLoading(false)
      }
    }

    loadPDFData()
  }, [sourceId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Loading PDF...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-2 max-w-md">
          <h2 className="text-xl font-semibold">Error Loading PDF</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (!source) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-sm text-muted-foreground">PDF source not found</p>
      </div>
    )
  }

  return (
    <PDFReader
      sourceId={source.id}
      title={source.title}
      fileUrl={source.fileUrl!}
      existingHighlights={highlights}
      onProgressUpdate={(page, totalPages) => {
        // Optional: Additional progress tracking logic
        console.log(`Progress updated: page ${page} of ${totalPages}`)
      }}
    />
  )
}

// Example 4: PDF Reader Page Component (for app/pdf/[id]/page.tsx)
export function PDFReaderPage({ params }: { params: { id: string } }) {
  const sourceId = parseInt(params.id, 10)

  if (isNaN(sourceId)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-sm text-muted-foreground">Invalid PDF ID</p>
      </div>
    )
  }

  return <DynamicPDFReaderExample sourceId={sourceId} />
}

// Example 5: PDF Reader with Custom Progress Handler
export function PDFReaderWithCustomProgressExample() {
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [progressPercentage, setProgressPercentage] = useState(0)

  const handleProgressUpdate = (page: number, total: number) => {
    setCurrentPage(page)
    setTotalPages(total)
    setProgressPercentage(Math.round((page / total) * 100))

    // Custom logic: Show notification when reaching certain milestones
    if (progressPercentage === 25) {
      console.log('25% complete!')
    } else if (progressPercentage === 50) {
      console.log('Halfway there!')
    } else if (progressPercentage === 75) {
      console.log('Almost done!')
    } else if (progressPercentage === 100) {
      console.log('Finished reading!')
    }
  }

  return (
    <div>
      {/* Optional: Custom progress display outside the reader */}
      <div className="fixed top-4 right-4 bg-background border rounded-lg p-3 shadow-lg z-50">
        <p className="text-sm font-medium">
          Page {currentPage} of {totalPages}
        </p>
        <p className="text-xs text-muted-foreground">{progressPercentage}% complete</p>
      </div>

      <PDFReader
        sourceId={1}
        title="PDF with Custom Progress Tracking"
        fileUrl="/samples/document.pdf"
        onProgressUpdate={handleProgressUpdate}
      />
    </div>
  )
}

// Example 6: PDF Reader with URL-based File Loading
export function PDFReaderWithURLExample() {
  const [fileUrl, setFileUrl] = useState<string>('')
  const [isReady, setIsReady] = useState(false)

  const handleLoadPDF = (url: string) => {
    setFileUrl(url)
    setIsReady(true)
  }

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="max-w-md space-y-4">
          <h2 className="text-xl font-semibold">Enter PDF URL</h2>
          <input
            type="url"
            placeholder="https://example.com/document.pdf"
            className="w-full px-4 py-2 border rounded-md"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleLoadPDF((e.target as HTMLInputElement).value)
              }
            }}
          />
        </div>
      </div>
    )
  }

  return <PDFReader sourceId={0} title="PDF from URL" fileUrl={fileUrl} />
}

// Example 7: Complete App Router Page Implementation
/**
 * File: app/highlights/sources/[id]/pdf/page.tsx
 *
 * This is how you would implement a complete page in Next.js App Router
 */
/*
import { PDFReader } from '@/components/reader/pdf-reader'
import { getSourceByIdAction, getHighlightsAction } from '@/app/actions/highlights'
import { notFound, redirect } from 'next/navigation'

interface PDFPageProps {
  params: { id: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function PDFPage({ params }: PDFPageProps) {
  const sourceId = parseInt(params.id, 10)

  if (isNaN(sourceId)) {
    notFound()
  }

  // Fetch source data
  const source = await getSourceByIdAction(sourceId)

  if (!source) {
    notFound()
  }

  // Verify it's a PDF
  if (source.sourceType !== 'pdf') {
    redirect(`/highlights/sources/${sourceId}`)
  }

  if (!source.fileUrl) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-sm text-muted-foreground">PDF file not found</p>
      </div>
    )
  }

  // Fetch highlights
  const highlights = await getHighlightsAction({
    sourceId: sourceId,
    limit: 1000,
  })

  // Transform highlights for PDF reader
  const pdfHighlights = highlights
    .filter((h) => h.location && typeof h.location === 'object' && 'page' in h.location)
    .map((h) => ({
      id: h.id,
      text: h.text,
      color: h.color || 'yellow',
      location: h.location,
    }))

  return (
    <PDFReader
      sourceId={source.id}
      title={source.title}
      fileUrl={source.fileUrl}
      existingHighlights={pdfHighlights}
    />
  )
}
*/

// Example 8: PDF Reader with Error Boundary
export function PDFReaderWithErrorBoundaryExample() {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <button
            onClick={() => setHasError(false)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  try {
    return (
      <PDFReader
        sourceId={1}
        title="PDF with Error Boundary"
        fileUrl="/samples/document.pdf"
      />
    )
  } catch (error) {
    setHasError(true)
    return null
  }
}
