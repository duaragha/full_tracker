'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { HighlightPopover } from './highlight-popover'
import { TableOfContents } from './table-of-contents'
import { ReadingControls } from './reading-controls'
import { SelectionManager, TextSelection } from '@/lib/reader/selection-manager'
import { extractTOC, addTOCIdsToHTML, flattenTOC, TOCItem } from '@/lib/reader/toc-extractor'
import { Highlight } from '@/types/highlight'
import { updateSourceAction } from '@/app/actions/highlights'

interface ArticleReaderProps {
  sourceId: number
  title: string
  author?: string
  htmlContent: string
  existingHighlights?: Array<{
    id: number
    text: string
    color: string
    location: any
    locationStart?: number
    locationEnd?: number
  }>
  onProgressUpdate?: (position: number) => void
}

/**
 * ArticleReader - A client component for reading and highlighting articles
 *
 * Features:
 * - Text selection with mouse events
 * - Inline highlights rendered as <mark> tags
 * - Reading progress tracking with automatic updates
 * - Clean typography optimized for reading
 * - Support for light/dark mode
 */
export function ArticleReader({
  sourceId,
  title,
  author,
  htmlContent,
  existingHighlights = [],
  onProgressUpdate,
}: ArticleReaderProps) {
  const [selection, setSelection] = useState<TextSelection | null>(null)
  const [showPopover, setShowPopover] = useState(false)
  const [highlights, setHighlights] = useState<typeof existingHighlights>(existingHighlights)
  const [tocItems, setTocItems] = useState<TOCItem[]>([])
  const [processedHtml, setProcessedHtml] = useState<string>(htmlContent)
  const [fontSize, setFontSize] = useState(18)
  const [lineHeight, setLineHeight] = useState(1.6)
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>('dark')
  const [contentWidth, setContentWidth] = useState<'narrow' | 'default' | 'wide'>('default')
  const contentRef = useRef<HTMLDivElement>(null)
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastProgressRef = useRef<number>(0)

  /**
   * Handle text selection
   */
  const handleTextSelection = useCallback(() => {
    const sel = SelectionManager.getSelection()

    if (sel && sel.text.length > 0) {
      setSelection(sel)
      setShowPopover(true)
    } else {
      setShowPopover(false)
    }
  }, [])

  /**
   * Handle popover close
   */
  const handleClosePopover = useCallback(() => {
    setShowPopover(false)
    setSelection(null)
    SelectionManager.clearSelection()
  }, [])

  /**
   * Handle highlight creation
   */
  const handleHighlightCreated = useCallback((highlightId: number) => {
    if (!selection) return

    // Add the new highlight to state
    const newHighlight = {
      id: highlightId,
      text: selection.text,
      color: 'yellow', // Default color, will be updated from API
      location: {
        startOffset: selection.startOffset,
        endOffset: selection.endOffset,
      },
      locationStart: selection.startOffset,
      locationEnd: selection.endOffset,
    }

    setHighlights((prev) => [...prev, newHighlight])

    // Apply highlight to the DOM
    const range = SelectionManager.getCurrentRange()
    if (range) {
      SelectionManager.createHighlightMarker(range, highlightId, 'yellow')
    }

    handleClosePopover()
  }, [selection, handleClosePopover])

  /**
   * Calculate and update reading progress based on scroll position
   */
  const updateProgress = useCallback(() => {
    if (!contentRef.current || !onProgressUpdate) return

    const element = contentRef.current
    const scrollTop = window.scrollY
    const elementTop = element.offsetTop
    const elementHeight = element.scrollHeight
    const viewportHeight = window.innerHeight

    // Calculate percentage of content that has been scrolled past
    const visibleTop = Math.max(0, scrollTop - elementTop)
    const progress = Math.min(100, Math.round((visibleTop / elementHeight) * 100))

    // Only update if progress has changed by at least 1%
    if (Math.abs(progress - lastProgressRef.current) >= 1) {
      lastProgressRef.current = progress
      onProgressUpdate(progress)

      // Save to database (debounced)
      updateSourceAction(sourceId, { readingProgress: progress }).catch((err) => {
        console.error('Error updating reading progress:', err)
      })
    }
  }, [sourceId, onProgressUpdate])

  /**
   * Debounced scroll handler
   */
  const handleScroll = useCallback(() => {
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current)
    }

    progressTimerRef.current = setTimeout(() => {
      updateProgress()
    }, 500) // Debounce for 500ms
  }, [updateProgress])

  /**
   * Apply existing highlights to the content
   */
  const applyHighlights = useCallback(() => {
    if (!contentRef.current || highlights.length === 0) return

    // Sort highlights by start position to apply them in order
    const sortedHighlights = [...highlights].sort((a, b) => {
      const aStart = a.locationStart ?? 0
      const bStart = b.locationStart ?? 0
      return aStart - bStart
    })

    // Apply each highlight
    sortedHighlights.forEach((highlight) => {
      const textToFind = highlight.text
      const color = highlight.color || 'yellow'

      // Simple text matching approach
      // In production, you might want a more sophisticated approach using location offsets
      try {
        const walker = document.createTreeWalker(
          contentRef.current!,
          NodeFilter.SHOW_TEXT,
          null
        )

        const textNodes: Text[] = []
        let node: Node | null

        while ((node = walker.nextNode())) {
          textNodes.push(node as Text)
        }

        // Find the text in the content
        let fullText = textNodes.map((n) => n.textContent).join('')
        let searchIndex = 0

        for (let i = 0; i < textNodes.length; i++) {
          const textNode = textNodes[i]
          const nodeText = textNode.textContent || ''
          const nodeStart = searchIndex
          const nodeEnd = searchIndex + nodeText.length

          // Check if this node contains part of our highlight text
          const textIndex = fullText.indexOf(textToFind, nodeStart)

          if (textIndex >= nodeStart && textIndex < nodeEnd) {
            // Found the text in this node
            const startOffset = textIndex - nodeStart
            const endOffset = Math.min(
              startOffset + textToFind.length,
              nodeText.length
            )

            const range = document.createRange()
            range.setStart(textNode, startOffset)
            range.setEnd(textNode, endOffset)

            SelectionManager.createHighlightMarker(range, highlight.id, color)
            break
          }

          searchIndex = nodeEnd
        }
      } catch (error) {
        console.error('Error applying highlight:', error)
      }
    })
  }, [highlights])

  /**
   * Setup event listeners
   */
  useEffect(() => {
    // Listen for text selection
    document.addEventListener('mouseup', handleTextSelection)

    // Listen for scroll events for progress tracking
    if (onProgressUpdate) {
      window.addEventListener('scroll', handleScroll)

      // Initial progress calculation
      updateProgress()
    }

    return () => {
      document.removeEventListener('mouseup', handleTextSelection)
      window.removeEventListener('scroll', handleScroll)

      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current)
      }
    }
  }, [handleTextSelection, handleScroll, onProgressUpdate, updateProgress])

  /**
   * Extract TOC and add IDs to HTML content
   */
  useEffect(() => {
    if (htmlContent) {
      // Extract TOC structure
      const toc = extractTOC(htmlContent)
      setTocItems(toc)

      // Add TOC IDs to HTML content
      const flatItems = flattenTOC(toc)
      const htmlWithIds = addTOCIdsToHTML(htmlContent, flatItems)
      setProcessedHtml(htmlWithIds)
    }
  }, [htmlContent])

  /**
   * Apply highlights when content is loaded or highlights change
   */
  useEffect(() => {
    if (contentRef.current && processedHtml) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        applyHighlights()
      }, 100)
    }
  }, [processedHtml, applyHighlights])

  /**
   * Sanitize HTML content
   * In production, use a library like DOMPurify
   */
  const sanitizeHtml = (html: string): string => {
    // Basic sanitization - remove script tags and event handlers
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/g, '')
      .replace(/on\w+='[^']*'/g, '')
  }

  const sanitizedContent = sanitizeHtml(processedHtml)

  // Extract plain text for text-to-speech
  const getPlainText = (html: string): string => {
    const temp = document.createElement('div')
    temp.innerHTML = html
    return temp.textContent || temp.innerText || ''
  }

  const plainText = typeof window !== 'undefined' ? getPlainText(sanitizedContent) : ''

  // Get theme colors
  const getThemeStyles = () => {
    switch (theme) {
      case 'sepia':
        return {
          backgroundColor: '#f4ecd8',
          color: '#5c4a2f',
        }
      case 'dark':
        return {
          backgroundColor: '#0a0a0a',
          color: '#e5e5e5',
        }
      default:
        return {
          backgroundColor: '#ffffff',
          color: '#000000',
        }
    }
  }

  // Get content width
  const getContentWidth = () => {
    switch (contentWidth) {
      case 'narrow':
        return '600px'
      case 'wide':
        return '900px'
      default:
        return '700px'
    }
  }

  const themeStyles = getThemeStyles()
  const maxWidth = getContentWidth()

  return (
    <>
      {/* Table of Contents Sidebar */}
      <TableOfContents items={tocItems} />

      {/* Main Content - Add right padding on desktop to account for TOC */}
      <div className="lg:pr-80">
        {/* Reading Controls */}
        <ReadingControls
          articleContent={plainText}
          onFontSizeChange={setFontSize}
          onLineHeightChange={setLineHeight}
          onThemeChange={setTheme}
          onContentWidthChange={setContentWidth}
        />
        <Card className="max-w-4xl mx-auto my-8" style={themeStyles}>
          <CardHeader className="border-b" style={themeStyles}>
            <CardTitle className="text-3xl font-bold leading-tight" style={{ color: themeStyles.color }}>
              {title}
            </CardTitle>
            {author && (
              <CardDescription className="text-base mt-2" style={{ color: themeStyles.color, opacity: 0.7 }}>
                by {author}
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className="pt-6" style={themeStyles}>
            <article
              ref={contentRef}
              id="article-content"
              className="prose prose-lg dark:prose-invert max-w-none"
              style={{
                fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                lineHeight: lineHeight,
                fontSize: `${fontSize}px`,
                maxWidth: maxWidth,
                margin: '0 auto',
                color: themeStyles.color,
              }}
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Highlight Popover */}
      {showPopover && selection && (
        <HighlightPopover
          selection={selection}
          sourceId={sourceId}
          onClose={handleClosePopover}
          onHighlightCreated={handleHighlightCreated}
        />
      )}

      {/* Custom styles for better reading experience */}
      <style jsx global>{`
        #article-content {
          padding: 2rem 1rem;
        }

        #article-content p {
          margin-bottom: 1.5em;
          color: inherit;
        }

        #article-content h1,
        #article-content h2,
        #article-content h3,
        #article-content h4,
        #article-content h5,
        #article-content h6 {
          margin-top: 2em;
          margin-bottom: 0.75em;
          font-weight: 600;
          line-height: 1.3;
          scroll-margin-top: 100px; /* Offset for smooth scrolling */
        }

        #article-content h1 {
          font-size: 2em;
        }

        #article-content h2 {
          font-size: 1.5em;
        }

        #article-content h3 {
          font-size: 1.25em;
        }

        #article-content a {
          color: hsl(var(--primary));
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        #article-content a:hover {
          opacity: 0.8;
        }

        #article-content img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 2em auto;
          display: block;
        }

        #article-content blockquote {
          border-left: 4px solid hsl(var(--border));
          padding-left: 1em;
          margin: 1.5em 0;
          color: hsl(var(--muted-foreground));
          font-style: italic;
        }

        #article-content code {
          background-color: hsl(var(--muted));
          padding: 0.2em 0.4em;
          border-radius: 4px;
          font-size: 0.9em;
          font-family: 'Courier New', monospace;
        }

        #article-content pre {
          background-color: hsl(var(--muted));
          padding: 1em;
          border-radius: 8px;
          overflow-x: auto;
          margin: 1.5em 0;
        }

        #article-content pre code {
          background-color: transparent;
          padding: 0;
        }

        #article-content ul,
        #article-content ol {
          margin: 1.5em 0;
          padding-left: 2em;
        }

        #article-content li {
          margin-bottom: 0.5em;
        }

        #article-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 2em 0;
        }

        #article-content th,
        #article-content td {
          border: 1px solid hsl(var(--border));
          padding: 0.75em;
          text-align: left;
        }

        #article-content th {
          background-color: hsl(var(--muted));
          font-weight: 600;
        }

        /* Highlight marker styles */
        mark.highlight-marker {
          padding: 0.1em 0;
          border-radius: 2px;
        }

        mark.highlight-marker:hover {
          box-shadow: 0 0 0 2px hsl(var(--ring));
        }

        /* User select for better highlighting experience */
        #article-content ::selection {
          background-color: hsl(var(--primary) / 0.3);
        }
      `}</style>
    </>
  )
}
