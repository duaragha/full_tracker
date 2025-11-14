'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ReactReader, ReactReaderStyle } from 'react-reader'
import type { Rendition, NavItem, Contents } from 'epubjs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { HighlightPopover } from './highlight-popover'
import { SelectionManager, TextSelection } from '@/lib/reader/selection-manager'
import { updateSourceAction } from '@/app/actions/highlights'
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  AlertCircle,
  Loader2,
  Type,
  Sun,
  Moon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface EPUBReaderProps {
  sourceId: number
  title: string
  fileUrl: string // URL or path to EPUB file
  existingHighlights?: Array<{
    id: number
    text: string
    color: string
    location: any
  }>
  onProgressUpdate?: (location: string, percentage: number) => void
}

type FontSize = 'small' | 'medium' | 'large'
type Theme = 'light' | 'dark' | 'sepia'

const FONT_SIZE_MAP: Record<FontSize, string> = {
  small: '16px',
  medium: '18px',
  large: '22px',
}

const THEME_CONFIG: Record<Theme, { background: string; color: string }> = {
  light: { background: '#ffffff', color: '#000000' },
  dark: { background: '#1a1a1a', color: '#e0e0e0' },
  sepia: { background: '#f4f1ea', color: '#5f4b32' },
}

const STORAGE_KEYS = {
  FONT_SIZE: 'epub-reader-font-size',
  THEME: 'epub-reader-theme',
  LOCATION: (sourceId: number) => `epub-location-${sourceId}`,
}

/**
 * EPUBReader - A comprehensive EPUB reader component with highlighting support
 *
 * Features:
 * - Full EPUB rendering with ReactReader
 * - Chapter navigation with TOC sidebar
 * - Reading progress tracking
 * - Text selection and highlighting
 * - Bookmarking support
 * - Font size and theme controls
 * - Error handling for corrupt files
 * - Persistent reading location
 */
export function EPUBReader({
  sourceId,
  title,
  fileUrl,
  existingHighlights = [],
  onProgressUpdate,
}: EPUBReaderProps) {
  // Core reader state
  const [location, setLocation] = useState<string | number>(0)
  const [rendition, setRendition] = useState<Rendition | null>(null)
  const [toc, setToc] = useState<NavItem[]>([])
  const [currentChapter, setCurrentChapter] = useState<string>('')

  // UI state
  const [showToc, setShowToc] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [totalLocations, setTotalLocations] = useState(0)

  // Settings state
  const [fontSize, setFontSize] = useState<FontSize>('medium')
  const [theme, setTheme] = useState<Theme>('light')
  const [isBookmarked, setIsBookmarked] = useState(false)

  // Highlight state
  const [selection, setSelection] = useState<TextSelection | null>(null)
  const [showPopover, setShowPopover] = useState(false)
  const [highlights, setHighlights] = useState(existingHighlights)

  // Refs
  const renditionRef = useRef<Rendition | null>(null)
  const tocPanelRef = useRef<HTMLDivElement>(null)
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Load saved preferences and location
   */
  useEffect(() => {
    try {
      const savedFontSize = localStorage.getItem(STORAGE_KEYS.FONT_SIZE) as FontSize | null
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as Theme | null
      const savedLocation = localStorage.getItem(STORAGE_KEYS.LOCATION(sourceId))

      if (savedFontSize && savedFontSize in FONT_SIZE_MAP) {
        setFontSize(savedFontSize)
      }

      if (savedTheme && savedTheme in THEME_CONFIG) {
        setTheme(savedTheme)
      }

      if (savedLocation) {
        setLocation(savedLocation)
      }
    } catch (error) {
      console.error('Error loading EPUB preferences:', error)
    }
  }, [sourceId])

  /**
   * Handle EPUB load error
   */
  const handleLoadError = useCallback((err: Error) => {
    console.error('Error loading EPUB:', err)
    setError(`Failed to load EPUB: ${err.message}. The file may be corrupted or in an unsupported format.`)
    setIsLoading(false)
  }, [])

  /**
   * Initialize rendition when EPUB is ready
   */
  const handleRenditionCreated = useCallback((rendition: Rendition) => {
    renditionRef.current = rendition
    setRendition(rendition)
    setIsLoading(false)

    // Apply theme
    const { background, color } = THEME_CONFIG[theme]
    rendition.themes.default({ body: { background, color, 'font-size': FONT_SIZE_MAP[fontSize] } })

    // Setup text selection handling
    rendition.on('selected', (cfiRange: string, contents: Contents) => {
      handleTextSelection(cfiRange, contents)
    })

    // Generate locations for progress tracking
    rendition.book.ready.then(() => {
      return rendition.book.locations.generate(1024)
    }).then((locations: any) => {
      setTotalLocations(locations.total)
    }).catch((err: Error) => {
      console.error('Error generating locations:', err)
    })
  }, [theme, fontSize])

  /**
   * Handle text selection in EPUB
   */
  const handleTextSelection = useCallback((cfiRange: string, contents: Contents) => {
    if (!renditionRef.current) return

    try {
      const text = renditionRef.current.getRange(cfiRange).toString().trim()

      if (text.length === 0) {
        setShowPopover(false)
        return
      }

      // Get selection position for popover
      const range = renditionRef.current.getRange(cfiRange)
      const rect = range.getBoundingClientRect()

      const textSelection: TextSelection = {
        text,
        startOffset: 0, // CFI handles this internally
        endOffset: text.length,
        boundingRect: {
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
        },
      }

      setSelection({ ...textSelection, location: cfiRange } as any)
      setShowPopover(true)
    } catch (error) {
      console.error('Error handling text selection:', error)
    }
  }, [])

  /**
   * Handle location change (page turn)
   */
  const handleLocationChange = useCallback((epubcfi: string) => {
    setLocation(epubcfi)

    // Save location to localStorage
    try {
      localStorage.setItem(STORAGE_KEYS.LOCATION(sourceId), epubcfi)
    } catch (error) {
      console.error('Error saving location:', error)
    }

    // Calculate progress
    if (renditionRef.current?.book.locations) {
      const { locations } = renditionRef.current.book
      const currentLocation = locations.locationFromCfi(epubcfi)
      const percentage = locations.percentageFromCfi(epubcfi)

      setProgress(percentage * 100)

      // Update progress in database (debounced)
      if (onProgressUpdate) {
        if (progressTimerRef.current) {
          clearTimeout(progressTimerRef.current)
        }

        progressTimerRef.current = setTimeout(() => {
          onProgressUpdate(epubcfi, percentage * 100)
          updateSourceAction(sourceId, { readingProgress: Math.round(percentage * 100) }).catch((err) => {
            console.error('Error updating reading progress:', err)
          })
        }, 1000)
      }

      // Update current chapter
      if (toc.length > 0) {
        const chapter = findCurrentChapter(epubcfi, toc)
        if (chapter) {
          setCurrentChapter(chapter.label)
        }
      }
    }
  }, [sourceId, onProgressUpdate, toc])

  /**
   * Find current chapter from TOC based on CFI
   */
  const findCurrentChapter = (cfi: string, tocItems: NavItem[]): NavItem | null => {
    for (const item of tocItems) {
      if (item.href && cfi.includes(item.href)) {
        return item
      }
      if (item.subitems) {
        const found = findCurrentChapter(cfi, item.subitems)
        if (found) return found
      }
    }
    return null
  }

  /**
   * Handle TOC loaded
   */
  const handleTocLoaded = useCallback((tocItems: NavItem[]) => {
    setToc(tocItems)
  }, [])

  /**
   * Navigate to TOC item
   */
  const navigateToChapter = useCallback((href: string) => {
    if (renditionRef.current) {
      renditionRef.current.display(href)
      setShowToc(false)
    }
  }, [])

  /**
   * Navigate to next/previous page
   */
  const navigateNext = useCallback(() => {
    renditionRef.current?.next()
  }, [])

  const navigatePrevious = useCallback(() => {
    renditionRef.current?.prev()
  }, [])

  /**
   * Handle font size change
   */
  const handleFontSizeChange = useCallback((newSize: FontSize) => {
    setFontSize(newSize)
    localStorage.setItem(STORAGE_KEYS.FONT_SIZE, newSize)

    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(FONT_SIZE_MAP[newSize])
    }
  }, [])

  /**
   * Handle theme change
   */
  const handleThemeChange = useCallback((newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme)

    if (renditionRef.current) {
      const { background, color } = THEME_CONFIG[newTheme]
      renditionRef.current.themes.default({ body: { background, color } })
    }
  }, [])

  /**
   * Toggle bookmark
   */
  const handleToggleBookmark = useCallback(() => {
    setIsBookmarked(!isBookmarked)
    // Could save bookmark to database here
  }, [isBookmarked])

  /**
   * Handle highlight created
   */
  const handleHighlightCreated = useCallback((highlightId: number) => {
    if (!selection || !renditionRef.current) return

    const newHighlight = {
      id: highlightId,
      text: selection.text,
      color: 'yellow',
      location: (selection as any).location, // CFI range
    }

    setHighlights((prev) => [...prev, newHighlight])

    // Add highlight to EPUB
    try {
      renditionRef.current.annotations.add(
        'highlight',
        (selection as any).location,
        {},
        undefined,
        'highlight-marker',
        { fill: 'yellow', 'fill-opacity': '0.3', 'mix-blend-mode': 'multiply' }
      )
    } catch (error) {
      console.error('Error adding highlight to EPUB:', error)
    }

    setShowPopover(false)
    setSelection(null)
  }, [selection])

  /**
   * Apply existing highlights
   */
  useEffect(() => {
    if (!renditionRef.current || highlights.length === 0) return

    // Apply each highlight
    highlights.forEach((highlight) => {
      try {
        const colorMap: Record<string, string> = {
          yellow: '#ffeb3b',
          green: '#4caf50',
          blue: '#2196f3',
          pink: '#e91e63',
          purple: '#9c27b0',
        }

        renditionRef.current?.annotations.add(
          'highlight',
          highlight.location,
          {},
          undefined,
          'highlight-marker',
          {
            fill: colorMap[highlight.color] || '#ffeb3b',
            'fill-opacity': '0.3',
            'mix-blend-mode': 'multiply',
          }
        )
      } catch (error) {
        console.error('Error applying highlight:', error)
      }
    })
  }, [highlights, rendition])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current)
      }
    }
  }, [])

  /**
   * Custom reader styles
   */
  const readerStyles = {
    ...ReactReaderStyle,
    container: {
      ...ReactReaderStyle.container,
      overflow: 'hidden',
    },
    readerArea: {
      ...ReactReaderStyle.readerArea,
      backgroundColor: THEME_CONFIG[theme].background,
      transition: 'all 0.3s ease',
    },
    reader: {
      ...ReactReaderStyle.reader,
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
    },
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <Card className="max-w-4xl mx-auto my-8">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading EPUB</h3>
            <p className="text-muted-foreground max-w-md">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="relative w-full h-screen flex flex-col">
      {/* Top Toolbar */}
      <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Left: TOC Toggle & Title */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowToc(!showToc)}
                title="Table of Contents"
              >
                {showToc ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
              <div className="hidden sm:block">
                <h1 className="font-semibold text-sm line-clamp-1">{title}</h1>
                {currentChapter && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{currentChapter}</p>
                )}
              </div>
            </div>

            {/* Center: Progress */}
            <div className="flex-1 max-w-md min-w-[200px]">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-2">
              {/* Font Size */}
              <div className="flex items-center gap-1 border rounded-md p-1">
                <Button
                  variant={fontSize === 'small' ? 'default' : 'ghost'}
                  size="icon-sm"
                  onClick={() => handleFontSizeChange('small')}
                  title="Small font"
                >
                  <Type className="h-3 w-3" />
                </Button>
                <Button
                  variant={fontSize === 'medium' ? 'default' : 'ghost'}
                  size="icon-sm"
                  onClick={() => handleFontSizeChange('medium')}
                  title="Medium font"
                >
                  <Type className="h-4 w-4" />
                </Button>
                <Button
                  variant={fontSize === 'large' ? 'default' : 'ghost'}
                  size="icon-sm"
                  onClick={() => handleFontSizeChange('large')}
                  title="Large font"
                >
                  <Type className="h-5 w-5" />
                </Button>
              </div>

              {/* Theme */}
              <div className="flex items-center gap-1 border rounded-md p-1">
                <Button
                  variant={theme === 'light' ? 'default' : 'ghost'}
                  size="icon-sm"
                  onClick={() => handleThemeChange('light')}
                  title="Light theme"
                >
                  <Sun className="h-4 w-4" />
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'ghost'}
                  size="icon-sm"
                  onClick={() => handleThemeChange('dark')}
                  title="Dark theme"
                >
                  <Moon className="h-4 w-4" />
                </Button>
                <Button
                  variant={theme === 'sepia' ? 'default' : 'ghost'}
                  size="icon-sm"
                  onClick={() => handleThemeChange('sepia')}
                  title="Sepia theme"
                >
                  <BookOpen className="h-4 w-4" />
                </Button>
              </div>

              {/* Bookmark */}
              <Button
                variant="outline"
                size="icon"
                onClick={handleToggleBookmark}
                title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                className={cn(isBookmarked && 'text-yellow-600')}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="h-4 w-4" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* TOC Sidebar */}
        <div
          ref={tocPanelRef}
          className={cn(
            'absolute left-0 top-0 bottom-0 z-40 w-80 bg-background border-r transform transition-transform duration-300 ease-in-out overflow-y-auto',
            showToc ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Table of Contents</h2>
              <Button variant="ghost" size="icon-sm" onClick={() => setShowToc(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {toc.length === 0 ? (
              <p className="text-sm text-muted-foreground">No chapters available</p>
            ) : (
              <nav className="space-y-1">
                {toc.map((item, index) => (
                  <TocItem
                    key={index}
                    item={item}
                    onNavigate={navigateToChapter}
                    currentChapter={currentChapter}
                  />
                ))}
              </nav>
            )}
          </div>
        </div>

        {/* EPUB Reader */}
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading EPUB...</p>
              </div>
            </div>
          )}

          <ReactReader
            url={fileUrl}
            location={location}
            locationChanged={handleLocationChange}
            getRendition={handleRenditionCreated}
            tocChanged={handleTocLoaded}
            epubOptions={{
              flow: 'paginated',
              manager: 'default',
              allowScriptedContent: true,
            }}
            readerStyles={readerStyles}
            swipeable
          />

          {/* Navigation Arrows */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-between px-4">
            <Button
              variant="outline"
              size="icon"
              onClick={navigatePrevious}
              className="pointer-events-auto opacity-50 hover:opacity-100 transition-opacity"
              title="Previous page"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={navigateNext}
              className="pointer-events-auto opacity-50 hover:opacity-100 transition-opacity"
              title="Next page"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Highlight Popover */}
      {showPopover && selection && (
        <HighlightPopover
          selection={selection}
          sourceId={sourceId}
          onClose={() => {
            setShowPopover(false)
            setSelection(null)
          }}
          onHighlightCreated={handleHighlightCreated}
        />
      )}
    </div>
  )
}

/**
 * TOC Item Component (recursive for nested chapters)
 */
interface TocItemProps {
  item: NavItem
  onNavigate: (href: string) => void
  currentChapter: string
  level?: number
}

function TocItem({ item, onNavigate, currentChapter, level = 0 }: TocItemProps) {
  const isActive = item.label === currentChapter

  return (
    <div>
      <button
        onClick={() => item.href && onNavigate(item.href)}
        className={cn(
          'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          isActive && 'bg-accent text-accent-foreground font-medium',
          !item.href && 'cursor-default opacity-60'
        )}
        style={{ paddingLeft: `${0.75 + level * 1}rem` }}
        disabled={!item.href}
      >
        {item.label}
      </button>

      {item.subitems && item.subitems.length > 0 && (
        <div className="mt-1">
          {item.subitems.map((subitem, index) => (
            <TocItem
              key={index}
              item={subitem}
              onNavigate={onNavigate}
              currentChapter={currentChapter}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
