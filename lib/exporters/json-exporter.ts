// ============================================
// JSON Exporter
// Export highlights to JSON format with complete data structure
// ============================================

import { ExportOptions, ExportResult, Highlight } from './types'
import { getHighlights } from '@/lib/db/highlights-store'
import { getSources } from '@/lib/db/highlight-sources-store'

export interface JSONExportOptions extends ExportOptions {
  pretty?: boolean
  includeReviewData?: boolean
  includeCollections?: boolean
}

export interface JSONExportData {
  exportDate: string
  version: string
  totalHighlights: number
  totalSources: number
  sources: SourceExportData[]
  metadata: {
    exportedBy: string
    exportOptions: JSONExportOptions
  }
}

export interface SourceExportData {
  id: number
  title: string
  author?: string
  sourceType: string
  isbn?: string
  asin?: string
  url?: string
  publisher?: string
  publishedDate?: string
  category?: string
  tags?: string[]
  totalHighlights: number
  lastHighlightedAt?: string
  coverImageUrl?: string
  metadata?: any
  highlights: HighlightExportData[]
  createdAt: string
  updatedAt: string
}

export interface HighlightExportData {
  id: number
  text: string
  note?: string
  location?: any
  color?: string
  highlightType: string
  isFavorite: boolean
  isArchived: boolean
  reviewEnabled: boolean
  highlightedAt: string
  tags?: string[]
  reviewData?: {
    easinessFactor: number
    intervalDays: number
    repetitions: number
    nextReviewDate: string
    lastReviewedAt?: string
    totalReviews: number
    correctReviews: number
  }
  createdAt: string
  updatedAt: string
}

/**
 * Export highlights to JSON format
 */
export async function exportToJSON(
  options: JSONExportOptions = {}
): Promise<ExportResult> {
  try {
    // Fetch data
    const data = await buildJSONExportData(options)

    // Convert to JSON string
    const jsonString = options.pretty
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data)

    return {
      success: true,
      itemsExported: data.totalHighlights,
      itemsFailed: 0,
      outputPath: jsonString
    }
  } catch (error) {
    console.error('JSON export error:', error)
    return {
      success: false,
      itemsExported: 0,
      itemsFailed: 0,
      error: 'Export failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Build complete JSON export data structure
 */
async function buildJSONExportData(
  options: JSONExportOptions
): Promise<JSONExportData> {
  // Fetch sources with filters
  const sources = await getSources({
    sourceIds: options.sourceIds,
    limit: 10000
  })

  // Fetch all highlights for these sources
  const allHighlights = await getHighlights({
    highlightIds: options.highlightIds,
    sourceIds: options.sourceIds,
    tags: options.tagFilter,
    limit: 100000
  })

  // Group highlights by source
  const highlightsBySource = new Map<number, any[]>()
  allHighlights.forEach(highlight => {
    if (!highlightsBySource.has(highlight.sourceId)) {
      highlightsBySource.set(highlight.sourceId, [])
    }
    highlightsBySource.get(highlight.sourceId)!.push(highlight)
  })

  // Build source export data
  const sourceExportData: SourceExportData[] = sources.map(source => {
    const sourceHighlights = highlightsBySource.get(source.id) || []

    return {
      id: source.id,
      title: source.title,
      author: source.author || undefined,
      sourceType: source.sourceType,
      isbn: source.isbn || undefined,
      asin: source.asin || undefined,
      url: source.url || undefined,
      publisher: source.publisher || undefined,
      publishedDate: source.publishedDate || undefined,
      category: source.category || undefined,
      tags: source.tags || undefined,
      totalHighlights: source.totalHighlights,
      lastHighlightedAt: source.lastHighlightedAt || undefined,
      coverImageUrl: source.coverImageUrl || undefined,
      metadata: source.metadata || undefined,
      highlights: sourceHighlights.map(h => mapHighlightToExport(h, options)),
      createdAt: source.createdAt.toISOString(),
      updatedAt: source.updatedAt.toISOString()
    }
  })

  return {
    exportDate: new Date().toISOString(),
    version: '1.0.0',
    totalHighlights: allHighlights.length,
    totalSources: sources.length,
    sources: sourceExportData,
    metadata: {
      exportedBy: 'Full Tracker - Highlights System',
      exportOptions: options
    }
  }
}

/**
 * Map highlight to export format
 */
function mapHighlightToExport(
  highlight: any,
  options: JSONExportOptions
): HighlightExportData {
  const exportData: HighlightExportData = {
    id: highlight.id,
    text: highlight.text,
    note: highlight.note || undefined,
    location: highlight.location || undefined,
    color: highlight.color || undefined,
    highlightType: highlight.highlightType || 'highlight',
    isFavorite: highlight.isFavorite || false,
    isArchived: highlight.isArchived || false,
    reviewEnabled: highlight.reviewEnabled || false,
    highlightedAt: new Date(highlight.highlightedAt).toISOString(),
    tags: highlight.tags || undefined,
    createdAt: new Date(highlight.createdAt).toISOString(),
    updatedAt: new Date(highlight.updatedAt).toISOString()
  }

  // Add review data if requested and available
  if (options.includeReviewData && highlight.reviewData) {
    exportData.reviewData = {
      easinessFactor: highlight.reviewData.easinessFactor,
      intervalDays: highlight.reviewData.intervalDays,
      repetitions: highlight.reviewData.repetitions,
      nextReviewDate: highlight.reviewData.nextReviewDate,
      lastReviewedAt: highlight.reviewData.lastReviewedAt || undefined,
      totalReviews: highlight.reviewData.totalReviews || 0,
      correctReviews: highlight.reviewData.correctReviews || 0
    }
  }

  return exportData
}

/**
 * Export to JSON schema format (for validation/documentation)
 */
export function getJSONExportSchema(): any {
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Highlights Export Schema',
    version: '1.0.0',
    type: 'object',
    required: ['exportDate', 'version', 'sources'],
    properties: {
      exportDate: {
        type: 'string',
        format: 'date-time',
        description: 'When the export was created'
      },
      version: {
        type: 'string',
        description: 'Export format version'
      },
      totalHighlights: {
        type: 'integer',
        description: 'Total number of highlights in export'
      },
      totalSources: {
        type: 'integer',
        description: 'Total number of sources in export'
      },
      sources: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'title', 'sourceType', 'highlights'],
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            author: { type: 'string' },
            sourceType: { type: 'string' },
            highlights: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'text', 'highlightedAt'],
                properties: {
                  id: { type: 'integer' },
                  text: { type: 'string' },
                  note: { type: 'string' },
                  location: { type: 'object' },
                  highlightedAt: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        }
      }
    }
  }
}
