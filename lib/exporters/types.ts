// ============================================
// Export Types and Interfaces
// ============================================

export interface ExportOptions {
  highlightIds?: number[]
  sourceIds?: number[]
  tagFilter?: string[]
  includeNotes?: boolean
  includeMetadata?: boolean
}

export interface ExportResult {
  success: boolean
  itemsExported: number
  itemsFailed: number
  outputPath?: string
  outputUrl?: string
  error?: string
  details?: string
}

export interface Highlight {
  id: number
  text: string
  note?: string
  color?: string
  location?: any
  highlightedAt: Date
  sourceId: number
  sourceTitle: string
  sourceAuthor?: string
  sourceType: string
  tags?: string[]
}

export interface GroupedHighlights {
  [sourceKey: string]: {
    source: {
      id: number
      title: string
      author?: string
      type: string
    }
    highlights: Highlight[]
  }
}

export interface OneNoteConfig {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  notebookId?: string
  sectionId?: string
}

export interface ExportJob {
  id: number
  exportType: 'onenote' | 'notion' | 'markdown' | 'json' | 'csv' | 'pdf'
  format?: string
  highlightIds?: number[]
  sourceIds?: number[]
  tagFilter?: string[]
  status: 'pending' | 'processing' | 'completed' | 'failed'
  itemsProcessed: number
  itemsExported: number
  itemsFailed: number
  outputPath?: string
  outputSizeBytes?: number
  errorMessage?: string
  errorDetails?: any
  startedAt?: Date
  completedAt?: Date
  metadata?: any
  createdAt: Date
}

export interface OAuthCredential {
  id: number
  provider: 'onenote' | 'notion' | 'evernote' | 'google_drive' | 'dropbox'
  accessToken: string
  refreshToken?: string
  tokenType: string
  expiresAt?: Date
  userId?: string
  userEmail?: string
  userName?: string
  scopes?: string[]
  isActive: boolean
  metadata?: any
  createdAt: Date
  updatedAt: Date
}
