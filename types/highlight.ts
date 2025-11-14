// TypeScript types for Readwise/Highlights feature

export type SourceType = 'kindle' | 'web_article' | 'pdf' | 'epub' | 'manual' | 'book'
export type LocationType = 'page' | 'percentage' | 'kindle_location' | 'time'
export type ExportType = 'onenote' | 'notion' | 'markdown' | 'evernote' | 'roam'
export type ImportType = 'kindle' | 'pdf' | 'web_article' | 'csv'
export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface HighlightSource {
  id: number
  sourceType: SourceType
  title: string
  author?: string | null
  url?: string | null
  bookId?: number | null
  isbn?: string | null
  fileUrl?: string | null
  fileSizeBytes?: bigint | null
  fileMimeType?: string | null
  thumbnailUrl?: string | null
  publishedDate?: string | null
  domain?: string | null
  readingProgress?: number
  totalPages?: number | null
  content?: string | null
  excerpt?: string | null
  category?: string | null
  createdAt: string
  updatedAt: string
  lastHighlightedAt?: string | null

  // Reader fields
  fileStoragePath?: string | null
  fullContentHtml?: string | null
  fullContent?: string | null

  // Computed fields
  highlightCount?: number
  book?: {
    id: number
    title: string
    author?: string
    coverImage?: string
  }
}

export interface Highlight {
  id: number
  sourceId: number
  text: string
  note?: string | null
  locationType?: LocationType | null
  locationValue?: number | null
  locationStart?: number | null
  locationEnd?: number | null
  location?: any // JSONB field for flexible location data
  color?: string
  isFavorite?: boolean
  isArchived?: boolean
  highlightedAt: string
  createdAt: string
  updatedAt: string

  // Denormalized source fields for exports
  sourceTitle?: string
  sourceAuthor?: string | null
  sourceType?: string

  // Relations
  source?: HighlightSource
  tags?: HighlightTag[]
  review?: HighlightReview
}

export interface HighlightTag {
  id: number
  name: string
  color?: string
  description?: string | null
  createdAt: string
  updatedAt: string

  // Computed
  highlightCount?: number
}

export interface HighlightReview {
  id: number
  highlightId: number
  repetitionCount: number
  easinessFactor: number
  intervalDays: number
  lastReviewedAt?: string | null
  nextReviewAt: string
  correctCount: number
  incorrectCount: number
  isSuspended: boolean
  createdAt: string
  updatedAt: string
}

export interface ReviewHistory {
  id: number
  highlightId: number
  quality: number // 0-5
  timeTakenSeconds?: number | null
  easinessFactor: number
  intervalDays: number
  repetitionCount: number
  reviewedAt: string
}

export interface ExportConfig {
  id: number
  exportType: ExportType
  accessToken?: string | null
  refreshToken?: string | null
  tokenExpiresAt?: string | null
  onenoteNotebookId?: string | null
  onenoteSectionId?: string | null
  notionDatabaseId?: string | null
  autoExport: boolean
  exportFrequency: string
  lastExportAt?: string | null
  templateFormat?: string | null
  createdAt: string
  updatedAt: string
}

export interface ExportHistory {
  id: number
  configId: number
  highlightCount: number
  status: 'success' | 'failed' | 'partial'
  errorMessage?: string | null
  exportedAt: string
}

export interface ImportJob {
  id: number
  importType: ImportType
  fileUrl?: string | null
  fileName?: string | null
  status: ImportStatus
  progressPercentage: number
  highlightsImported: number
  sourcesCreated: number
  duplicatesSkipped: number
  errorsCount: number
  errorMessage?: string | null
  startedAt?: string | null
  completedAt?: string | null
  createdAt: string
  updatedAt: string
}

// DTOs for API/Actions
export interface CreateSourceDTO {
  sourceType: SourceType
  title: string
  author?: string
  url?: string
  bookId?: number
  isbn?: string
  publishedDate?: string
  domain?: string
  content?: string
  excerpt?: string
  category?: string
}

export interface CreateHighlightDTO {
  sourceId: number
  text: string
  note?: string
  locationType?: LocationType
  locationValue?: number
  locationStart?: number
  locationEnd?: number
  color?: string
  highlightedAt?: string
}

export interface UpdateHighlightDTO {
  text?: string
  note?: string
  color?: string
  tags?: number[] // Tag IDs
}

export interface ReviewResultDTO {
  highlightId: number
  quality: number // 0-5
  timeTakenSeconds?: number
}

export interface SearchFilters {
  query?: string
  sourceId?: number
  sourceType?: SourceType
  tagIds?: number[]
  startDate?: string
  endDate?: string
  hasNotes?: boolean
  bookId?: number
}

export interface ReviewQueueFilters {
  limit?: number
  dueDate?: string // Get reviews due by this date
  sourceId?: number
  tagIds?: number[]
}
