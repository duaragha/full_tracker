'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize2,
  Loader2,
  AlertCircle,
  Download,
  RotateCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { HighlightPopover } from './highlight-popover'
import { SelectionManager, TextSelection } from '@/lib/reader/selection-manager'
import { updateSourceAction } from '@/app/actions/highlights'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

// Highlight types for PDF location data
interface PDFHighlight {
  id: number
  text: string
  color: string
  location: {
    page: number
    startOffset: number
    endOffset: number
    boundingRect?: {
      top: number
      left: number
      width: number
      height: number
    }
  }
}

interface PDFReaderProps {
  sourceId: number
  title: string
  fileUrl: string
  existingHighlights?: PDFHighlight[]
  onProgressUpdate?: (page: number, totalPages: number) => void
}

type ZoomLevel = 'fit-width' | 'fit-page' | number

const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0]
const MIN_ZOOM = 0.5
const MAX_ZOOM = 3.0

export function PDFReader({
  sourceId,
  title,
  fileUrl,
  existingHighlights = [],
  onProgressUpdate,
}: PDFReaderProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageWidth, setPageWidth] = useState<number>(0)
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('fit-width')
  const [rotation, setRotation] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfLoadError, setPdfLoadError] = useState<boolean>(false)
  const [selection, setSelection] = useState<TextSelection | null>(null)
  const [highlights, setHighlights] = useState<PDFHighlight[]>(existingHighlights)
  const [isSavingProgress, setIsSavingProgress] = useState<boolean>(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Calculate page width based on zoom level
  useEffect(() => {
    if (!containerRef.current) return

    const updatePageWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 48 // Padding

        if (zoomLevel === 'fit-width') {
          setPageWidth(containerWidth)
        } else if (zoomLevel === 'fit-page') {
          setPageWidth(containerWidth * 0.9)
        } else {
          setPageWidth(containerWidth * (zoomLevel as number))
        }
      }
    }

    updatePageWidth()
    window.addEventListener('resize', updatePageWidth)
    return () => window.removeEventListener('resize', updatePageWidth)
  }, [zoomLevel])

  // Update progress to database (debounced)
  const saveProgress = useCallback(
    (page: number, total: number) => {
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current)
      }

      progressTimerRef.current = setTimeout(async () => {
        try {
          setIsSavingProgress(true)
          const progress = Math.round((page / total) * 100)
          await updateSourceAction(sourceId, {
            readingProgress: progress,
            totalPages: total,
          })
          onProgressUpdate?.(page, total)
        } catch (err) {
          console.error('Failed to save reading progress:', err)
        } finally {
          setIsSavingProgress(false)
        }
      }, 2000) // 2 second debounce
    },
    [sourceId, onProgressUpdate]
  )

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current)
      }
    }
  }, [])

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setIsLoading(false)
    setPdfLoadError(false)
    setError(null)
  }

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error)
    setError(`Failed to load PDF: ${error.message}`)
    setPdfLoadError(true)
    setIsLoading(false)
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1
      setCurrentPage(newPage)
      saveProgress(newPage, numPages)
    }
  }

  const goToNextPage = () => {
    if (currentPage < numPages) {
      const newPage = currentPage + 1
      setCurrentPage(newPage)
      saveProgress(newPage, numPages)
    }
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= numPages) {
      setCurrentPage(page)
      saveProgress(page, numPages)
    }
  }

  const handleZoomIn = () => {
    if (typeof zoomLevel === 'number') {
      const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel)
      if (currentIndex < ZOOM_LEVELS.length - 1) {
        setZoomLevel(ZOOM_LEVELS[currentIndex + 1])
      }
    } else {
      setZoomLevel(1.0)
    }
  }

  const handleZoomOut = () => {
    if (typeof zoomLevel === 'number') {
      const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel)
      if (currentIndex > 0) {
        setZoomLevel(ZOOM_LEVELS[currentIndex - 1])
      }
    } else {
      setZoomLevel(1.0)
    }
  }

  const toggleFitWidth = () => {
    setZoomLevel(zoomLevel === 'fit-width' ? 1.0 : 'fit-width')
  }

  const toggleFitPage = () => {
    setZoomLevel(zoomLevel === 'fit-page' ? 1.0 : 'fit-page')
  }

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  // Handle text selection for highlighting
  const handleTextSelection = useCallback(() => {
    const textSelection = SelectionManager.getSelection()

    if (textSelection) {
      // Add page number to selection for PDF context
      const selectionWithPage = {
        ...textSelection,
        page: currentPage,
      }
      setSelection(selectionWithPage as unknown as TextSelection)
    }
  }, [currentPage])

  // Attach mouseup listener for text selection
  useEffect(() => {
    const handleMouseUp = () => {
      // Small delay to ensure selection is complete
      setTimeout(handleTextSelection, 50)
    }

    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [handleTextSelection])

  const handleHighlightCreated = (highlightId: number) => {
    // Add the new highlight to the local state
    const newHighlight: PDFHighlight = {
      id: highlightId,
      text: selection?.text || '',
      color: 'yellow', // Default color
      location: {
        page: currentPage,
        startOffset: selection?.startOffset || 0,
        endOffset: selection?.endOffset || 0,
        boundingRect: selection?.boundingRect,
      },
    }
    setHighlights([...highlights, newHighlight])
    setSelection(null)
  }

  const handleClosePopover = () => {
    setSelection(null)
    SelectionManager.clearSelection()
  }

  // Render highlight overlays for current page
  const renderHighlightOverlays = () => {
    const pageHighlights = highlights.filter((h) => h.location.page === currentPage)

    return pageHighlights.map((highlight) => {
      if (!highlight.location.boundingRect) return null

      const { top, left, width, height } = highlight.location.boundingRect

      // Color classes for highlights
      const colorClasses: Record<string, string> = {
        yellow: 'bg-yellow-200/50 dark:bg-yellow-900/30',
        green: 'bg-green-200/50 dark:bg-green-900/30',
        blue: 'bg-blue-200/50 dark:bg-blue-900/30',
        pink: 'bg-pink-200/50 dark:bg-pink-900/30',
        purple: 'bg-purple-200/50 dark:bg-purple-900/30',
      }

      return (
        <div
          key={highlight.id}
          className={cn(
            'absolute pointer-events-none border border-transparent transition-all',
            colorClasses[highlight.color] || colorClasses.yellow
          )}
          style={{
            top: `${top}px`,
            left: `${left}px`,
            width: `${width}px`,
            height: `${height}px`,
          }}
          title={highlight.text}
        />
      )
    })
  }

  const progress = numPages > 0 ? (currentPage / numPages) * 100 : 0

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Toolbar */}
      <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Left Section: Title */}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold truncate">{title}</h1>
              <p className="text-xs text-muted-foreground">
                {isLoading ? 'Loading...' : `Page ${currentPage} of ${numPages}`}
              </p>
            </div>

            {/* Center Section: Navigation & Zoom */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Page Navigation */}
              <div className="flex items-center gap-1 border rounded-md p-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage <= 1 || isLoading}
                  title="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1 px-2">
                  <input
                    type="number"
                    min={1}
                    max={numPages}
                    value={currentPage}
                    onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                    className="w-12 text-center text-sm bg-transparent border-none outline-none"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-muted-foreground">/ {numPages}</span>
                </div>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={goToNextPage}
                  disabled={currentPage >= numPages || isLoading}
                  title="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 border rounded-md p-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleZoomOut}
                  disabled={isLoading || (typeof zoomLevel === 'number' && zoomLevel <= MIN_ZOOM)}
                  title="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>

                <span className="px-2 text-sm min-w-[60px] text-center">
                  {typeof zoomLevel === 'number'
                    ? `${Math.round(zoomLevel * 100)}%`
                    : zoomLevel === 'fit-width'
                    ? 'Fit W'
                    : 'Fit P'}
                </span>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleZoomIn}
                  disabled={isLoading || (typeof zoomLevel === 'number' && zoomLevel >= MAX_ZOOM)}
                  title="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>

              {/* Fit Controls */}
              <div className="flex items-center gap-1 border rounded-md p-1">
                <Button
                  variant={zoomLevel === 'fit-width' ? 'default' : 'ghost'}
                  size="icon-sm"
                  onClick={toggleFitWidth}
                  disabled={isLoading}
                  title="Fit to width"
                >
                  <Maximize className="h-4 w-4" />
                </Button>

                <Button
                  variant={zoomLevel === 'fit-page' ? 'default' : 'ghost'}
                  size="icon-sm"
                  onClick={toggleFitPage}
                  disabled={isLoading}
                  title="Fit to page"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Rotate */}
              <Button
                variant="outline"
                size="icon-sm"
                onClick={handleRotate}
                disabled={isLoading}
                title="Rotate page"
              >
                <RotateCw className="h-4 w-4" />
              </Button>

              {/* Download */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(fileUrl, '_blank')}
                disabled={isLoading}
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Reading Progress</span>
              <span className="font-medium">
                {Math.round(progress)}%
                {isSavingProgress && ' (saving...)'}
              </span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        </div>
      </div>

      {/* PDF Content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-950"
      >
        <div className="flex items-center justify-center min-h-full p-6">
          {error ? (
            <div className="text-center space-y-4 max-w-md">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <h2 className="text-xl font-semibold">Failed to Load PDF</h2>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
          ) : (
            <TransformWrapper
              initialScale={1}
              minScale={0.5}
              maxScale={3}
              disabled={typeof zoomLevel !== 'number'}
            >
              <TransformComponent
                wrapperClass="!w-auto !h-auto"
                contentClass="!w-auto !h-auto"
              >
                <div ref={pageRef} className="relative bg-white shadow-2xl">
                  <Document
                    file={fileUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={
                      <div className="flex items-center justify-center h-[600px] w-[450px] bg-white">
                        <div className="text-center space-y-3">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                          <p className="text-sm text-muted-foreground">Loading PDF...</p>
                        </div>
                      </div>
                    }
                    error={
                      <div className="flex items-center justify-center h-[600px] w-[450px] bg-white">
                        <div className="text-center space-y-3">
                          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
                          <p className="text-sm text-destructive">Failed to load PDF</p>
                        </div>
                      </div>
                    }
                  >
                    <Page
                      pageNumber={currentPage}
                      width={pageWidth}
                      rotate={rotation}
                      loading={
                        <div className="flex items-center justify-center h-[600px] bg-white">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      }
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      className="relative"
                    />
                  </Document>

                  {/* Highlight Overlays */}
                  {renderHighlightOverlays()}
                </div>
              </TransformComponent>
            </TransformWrapper>
          )}
        </div>
      </div>

      {/* Highlight Popover */}
      {selection && (
        <HighlightPopover
          selection={selection}
          sourceId={sourceId}
          onClose={handleClosePopover}
          onHighlightCreated={handleHighlightCreated}
        />
      )}

      {/* Keyboard shortcuts hint */}
      <div className="fixed bottom-4 right-4 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm border rounded-lg px-3 py-2 shadow-sm">
        <p>
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">←</kbd> Previous |{' '}
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">→</kbd> Next |{' '}
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">+</kbd> Zoom In |{' '}
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">-</kbd> Zoom Out
        </p>
      </div>
    </div>
  )
}

// Keyboard shortcuts
if (typeof window !== 'undefined') {
  document.addEventListener('keydown', (e) => {
    // Ignore if typing in input/textarea
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return
    }

    // Navigation shortcuts (handled by component state)
    // Zoom shortcuts
    if (e.key === '+' || e.key === '=') {
      e.preventDefault()
      // Trigger zoom in
      document.querySelector('[title="Zoom in"]')?.dispatchEvent(new MouseEvent('click'))
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault()
      // Trigger zoom out
      document.querySelector('[title="Zoom out"]')?.dispatchEvent(new MouseEvent('click'))
    }
  })
}
