/**
 * TypeScript type definitions for PDF Reader component
 */

// PDF Highlight Location Data
export interface PDFHighlightLocation {
  page: number // 1-indexed page number
  startOffset: number // Character offset from start of document
  endOffset: number // Character offset from start of document
  boundingRect?: PDFBoundingRect // Visual position on page
}

// Bounding rectangle for visual highlight positioning
export interface PDFBoundingRect {
  top: number // Y position from top of page (pixels)
  left: number // X position from left of page (pixels)
  width: number // Width of highlight (pixels)
  height: number // Height of highlight (pixels)
}

// PDF-specific highlight type
export interface PDFHighlight {
  id: number
  text: string
  color: string // 'yellow' | 'green' | 'blue' | 'pink' | 'purple'
  location: PDFHighlightLocation
  note?: string
  createdAt?: string
}

// Zoom level types
export type PDFZoomLevel = 'fit-width' | 'fit-page' | number

// PDF metadata
export interface PDFMetadata {
  title?: string
  author?: string
  subject?: string
  keywords?: string
  creator?: string
  producer?: string
  creationDate?: string
  modificationDate?: string
  pageCount?: number
}

// PDF source data
export interface PDFSourceData {
  id: number
  sourceType: 'pdf'
  title: string
  author?: string | null
  fileUrl: string
  fileSizeBytes?: number | null
  fileMimeType?: string
  readingProgress?: number // 0-100 percentage
  totalPages?: number | null
  thumbnailUrl?: string | null
  createdAt: string
  updatedAt: string
}

// PDF Reader Props
export interface PDFReaderProps {
  sourceId: number
  title: string
  fileUrl: string
  existingHighlights?: PDFHighlight[]
  onProgressUpdate?: (page: number, totalPages: number) => void
  initialPage?: number
  initialZoom?: PDFZoomLevel
}

// PDF Page Info
export interface PDFPageInfo {
  pageNumber: number
  width: number
  height: number
  rotation: number
  scale: number
}

// PDF Selection Data (extends TextSelection)
export interface PDFTextSelection {
  text: string
  startOffset: number
  endOffset: number
  page: number
  boundingRect: {
    top: number
    left: number
    width: number
    height: number
  }
}

// PDF Document Load Event
export interface PDFDocumentLoadEvent {
  numPages: number
  fingerprint: string
  metadata?: PDFMetadata
}

// PDF Page Render Event
export interface PDFPageRenderEvent {
  pageNumber: number
  cssTransform: boolean
  timestamp: number
}

// PDF Error Types
export type PDFErrorType =
  | 'load_error'
  | 'render_error'
  | 'network_error'
  | 'invalid_pdf'
  | 'password_required'
  | 'unknown'

export interface PDFError {
  type: PDFErrorType
  message: string
  details?: string
}

// PDF Navigation State
export interface PDFNavigationState {
  currentPage: number
  totalPages: number
  canGoBack: boolean
  canGoForward: boolean
  progress: number // 0-100 percentage
}

// PDF Zoom State
export interface PDFZoomState {
  level: PDFZoomLevel
  scale: number
  canZoomIn: boolean
  canZoomOut: boolean
}

// PDF Reader State (for state management)
export interface PDFReaderState {
  isLoading: boolean
  isReady: boolean
  error: PDFError | null
  navigation: PDFNavigationState
  zoom: PDFZoomState
  rotation: number // 0, 90, 180, 270
  highlights: PDFHighlight[]
  selectedHighlight: PDFHighlight | null
  activeSelection: PDFTextSelection | null
}

// PDF Reader Actions (for useReducer)
export type PDFReaderAction =
  | { type: 'DOCUMENT_LOADED'; payload: { numPages: number } }
  | { type: 'DOCUMENT_ERROR'; payload: PDFError }
  | { type: 'PAGE_CHANGED'; payload: { page: number } }
  | { type: 'ZOOM_CHANGED'; payload: { zoom: PDFZoomLevel } }
  | { type: 'ROTATION_CHANGED'; payload: { rotation: number } }
  | { type: 'HIGHLIGHT_CREATED'; payload: PDFHighlight }
  | { type: 'HIGHLIGHT_DELETED'; payload: { id: number } }
  | { type: 'HIGHLIGHT_SELECTED'; payload: PDFHighlight | null }
  | { type: 'TEXT_SELECTED'; payload: PDFTextSelection | null }
  | { type: 'LOADING_STARTED' }
  | { type: 'LOADING_COMPLETE' }
  | { type: 'ERROR_CLEARED' }

// PDF Render Options
export interface PDFRenderOptions {
  scale?: number
  rotation?: number
  renderTextLayer?: boolean
  renderAnnotationLayer?: boolean
  enableWebGL?: boolean
  canvasContext?: '2d' | 'webgl'
}

// PDF Download Options
export interface PDFDownloadOptions {
  filename?: string
  includeHighlights?: boolean
  format?: 'pdf' | 'annotated-pdf'
}

// PDF Search Result
export interface PDFSearchResult {
  pageNumber: number
  matchIndex: number
  text: string
  context: string
  boundingRect: PDFBoundingRect
}

// PDF Search Options
export interface PDFSearchOptions {
  query: string
  caseSensitive?: boolean
  wholeWords?: boolean
  highlightAll?: boolean
  maxResults?: number
}

// PDF Annotation (native PDF annotations)
export interface PDFAnnotation {
  id: string
  type: 'text' | 'highlight' | 'underline' | 'strikeout' | 'link'
  page: number
  rect: [number, number, number, number] // [x1, y1, x2, y2]
  contents?: string
  color?: [number, number, number] // RGB [0-1, 0-1, 0-1]
  author?: string
  createdAt?: string
}

// PDF Bookmark
export interface PDFBookmark {
  title: string
  page: number
  children?: PDFBookmark[]
}

// PDF Outline (table of contents)
export interface PDFOutline {
  title: string
  dest: string | number
  items?: PDFOutline[]
}

// PDF Statistics
export interface PDFStatistics {
  totalPages: number
  currentPage: number
  readingProgress: number // Percentage
  timeSpent: number // Seconds
  highlightCount: number
  wordCount?: number
  estimatedReadingTime?: number // Minutes
}

// PDF Export Format
export interface PDFExportData {
  source: PDFSourceData
  highlights: PDFHighlight[]
  metadata?: PDFMetadata
  statistics?: PDFStatistics
  exportedAt: string
}

// PDF Import Format
export interface PDFImportData {
  title: string
  fileUrl: string
  highlights?: Array<{
    text: string
    page: number
    color?: string
    note?: string
  }>
  metadata?: Partial<PDFMetadata>
}

// Highlight Color Options
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple'

export const HIGHLIGHT_COLORS: Record<
  HighlightColor,
  {
    name: string
    value: HighlightColor
    class: string
    hex: string
  }
> = {
  yellow: {
    name: 'Yellow',
    value: 'yellow',
    class: 'bg-yellow-200 dark:bg-yellow-900/40',
    hex: '#fef08a',
  },
  green: {
    name: 'Green',
    value: 'green',
    class: 'bg-green-200 dark:bg-green-900/40',
    hex: '#bbf7d0',
  },
  blue: {
    name: 'Blue',
    value: 'blue',
    class: 'bg-blue-200 dark:bg-blue-900/40',
    hex: '#bfdbfe',
  },
  pink: {
    name: 'Pink',
    value: 'pink',
    class: 'bg-pink-200 dark:bg-pink-900/40',
    hex: '#fbcfe8',
  },
  purple: {
    name: 'Purple',
    value: 'purple',
    class: 'bg-purple-200 dark:bg-purple-900/40',
    hex: '#e9d5ff',
  },
}

// Zoom level presets
export const ZOOM_PRESETS: number[] = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0]

export const MIN_ZOOM = 0.5
export const MAX_ZOOM = 3.0
export const DEFAULT_ZOOM = 1.0

// Utility type guards
export function isPDFHighlight(obj: any): obj is PDFHighlight {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'number' &&
    typeof obj.text === 'string' &&
    typeof obj.location === 'object' &&
    typeof obj.location.page === 'number'
  )
}

export function isPDFSource(obj: any): obj is PDFSourceData {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    obj.sourceType === 'pdf' &&
    typeof obj.fileUrl === 'string'
  )
}

export function isValidZoomLevel(zoom: any): zoom is PDFZoomLevel {
  return (
    zoom === 'fit-width' ||
    zoom === 'fit-page' ||
    (typeof zoom === 'number' && zoom >= MIN_ZOOM && zoom <= MAX_ZOOM)
  )
}

// Helper functions for location calculations
export function calculateProgress(currentPage: number, totalPages: number): number {
  if (totalPages === 0) return 0
  return Math.round((currentPage / totalPages) * 100)
}

export function pageToPercentage(page: number, totalPages: number): number {
  return (page / totalPages) * 100
}

export function percentageToPage(percentage: number, totalPages: number): number {
  return Math.ceil((percentage / 100) * totalPages)
}

// Convert highlight location to database format
export function highlightToDBFormat(highlight: PDFHighlight): {
  text: string
  location: object
  color: string
  note?: string
} {
  return {
    text: highlight.text,
    location: highlight.location,
    color: highlight.color,
    note: highlight.note,
  }
}

// Convert database format to PDF highlight
export function dbToHighlightFormat(
  dbHighlight: any,
  id: number
): PDFHighlight | null {
  if (!isPDFHighlight({ ...dbHighlight, id })) {
    return null
  }

  return {
    id,
    text: dbHighlight.text,
    color: dbHighlight.color || 'yellow',
    location: dbHighlight.location,
    note: dbHighlight.note,
    createdAt: dbHighlight.createdAt || dbHighlight.highlighted_at,
  }
}

// Validate PDF file
export function isValidPDFUrl(url: string): boolean {
  try {
    const urlObj = new URL(url, window.location.origin)
    return (
      urlObj.pathname.toLowerCase().endsWith('.pdf') ||
      url.includes('application/pdf') ||
      url.includes('pdf')
    )
  } catch {
    return false
  }
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

// Calculate estimated reading time
export function calculateReadingTime(pageCount: number, wordsPerPage: number = 300): number {
  const wordsPerMinute = 200
  const totalWords = pageCount * wordsPerPage
  return Math.ceil(totalWords / wordsPerMinute)
}

// Generate highlight excerpt
export function generateExcerpt(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + '...'
}
