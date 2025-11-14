// ============================================
// CSV Exporter
// Export highlights to CSV format
// ============================================

import { ExportOptions, ExportResult, Highlight } from './types'
import { getHighlights } from '@/lib/db/highlights-store'
import { format } from 'date-fns'

export interface CSVExportOptions extends ExportOptions {
  delimiter?: string
  includeHeaders?: boolean
  dateFormat?: string
}

/**
 * Export highlights to CSV format
 */
export async function exportToCSV(
  options: CSVExportOptions = {}
): Promise<ExportResult> {
  try {
    // Fetch highlights
    const highlights = await getHighlights({
      highlightIds: options.highlightIds,
      sourceIds: options.sourceIds,
      tags: options.tagFilter,
      limit: 100000
    })

    if (highlights.length === 0) {
      return {
        success: false,
        itemsExported: 0,
        itemsFailed: 0,
        error: 'No highlights found matching the criteria'
      }
    }

    // Generate CSV content
    const csvContent = generateCSVContent(highlights as Highlight[], options)

    return {
      success: true,
      itemsExported: highlights.length,
      itemsFailed: 0,
      outputPath: csvContent
    }
  } catch (error) {
    console.error('CSV export error:', error)
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
 * Generate CSV content from highlights
 */
function generateCSVContent(
  highlights: Highlight[],
  options: CSVExportOptions
): string {
  const delimiter = options.delimiter || ','
  const includeHeaders = options.includeHeaders !== false
  const dateFormat = options.dateFormat || 'yyyy-MM-dd HH:mm:ss'

  let csv = ''

  // Add headers
  if (includeHeaders) {
    const headers = [
      'ID',
      'Source Title',
      'Source Author',
      'Source Type',
      'Highlight Text',
      'Note',
      'Location Type',
      'Location Value',
      'Page',
      'Color',
      'Date Highlighted',
      'Tags',
      'Is Favorite',
      'Is Archived'
    ]
    csv += headers.map(h => escapeCSVField(h, delimiter)).join(delimiter) + '\n'
  }

  // Add data rows
  highlights.forEach(highlight => {
    const row = [
      highlight.id,
      highlight.sourceTitle || '',
      highlight.sourceAuthor || '',
      highlight.sourceType || '',
      highlight.text || '',
      highlight.note || '',
      getLocationType(highlight.location),
      getLocationValue(highlight.location),
      getLocationPage(highlight.location),
      highlight.color || '',
      format(new Date(highlight.highlightedAt), dateFormat),
      highlight.tags ? highlight.tags.join('; ') : '',
      highlight.isFavorite ? 'Yes' : 'No',
      highlight.isArchived ? 'Yes' : 'No'
    ]

    csv += row.map(field => escapeCSVField(String(field), delimiter)).join(delimiter) + '\n'
  })

  return csv
}

/**
 * Escape CSV field according to RFC 4180
 */
function escapeCSVField(field: string, delimiter: string = ','): string {
  // If field contains delimiter, quotes, or newlines, wrap in quotes and escape quotes
  if (
    field.includes(delimiter) ||
    field.includes('"') ||
    field.includes('\n') ||
    field.includes('\r')
  ) {
    // Escape quotes by doubling them
    const escaped = field.replace(/"/g, '""')
    return `"${escaped}"`
  }

  return field
}

/**
 * Get location type from location object
 */
function getLocationType(location: any): string {
  if (!location) return ''

  if (location.page) return 'page'
  if (location.location) return 'kindle_location'
  if (location.percent) return 'percentage'
  if (location.chapter) return 'chapter'
  if (location.timestamp) return 'timestamp'

  return ''
}

/**
 * Get location value from location object
 */
function getLocationValue(location: any): string {
  if (!location) return ''

  if (location.page) return String(location.page)
  if (location.location) return String(location.location)
  if (location.percent) return String(location.percent) + '%'
  if (location.chapter) return location.chapter
  if (location.timestamp) return location.timestamp

  return ''
}

/**
 * Get page number from location object
 */
function getLocationPage(location: any): string {
  if (!location) return ''
  if (location.page) return String(location.page)
  return ''
}

/**
 * Export to TSV (Tab-Separated Values) format
 */
export async function exportToTSV(
  options: Omit<CSVExportOptions, 'delimiter'> = {}
): Promise<ExportResult> {
  return exportToCSV({
    ...options,
    delimiter: '\t'
  })
}

/**
 * Export highlights with custom columns
 */
export async function exportToCustomCSV(
  columns: string[],
  options: CSVExportOptions = {}
): Promise<ExportResult> {
  try {
    const highlights = await getHighlights({
      highlightIds: options.highlightIds,
      sourceIds: options.sourceIds,
      tags: options.tagFilter,
      limit: 100000
    })

    if (highlights.length === 0) {
      return {
        success: false,
        itemsExported: 0,
        itemsFailed: 0,
        error: 'No highlights found'
      }
    }

    const delimiter = options.delimiter || ','
    let csv = ''

    // Add headers
    if (options.includeHeaders !== false) {
      csv += columns.map(c => escapeCSVField(c, delimiter)).join(delimiter) + '\n'
    }

    // Add data rows
    highlights.forEach(highlight => {
      const row = columns.map(col => {
        const value = getColumnValue(highlight as Highlight, col, options)
        return escapeCSVField(String(value), delimiter)
      })
      csv += row.join(delimiter) + '\n'
    })

    return {
      success: true,
      itemsExported: highlights.length,
      itemsFailed: 0,
      outputPath: csv
    }
  } catch (error) {
    console.error('Custom CSV export error:', error)
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
 * Get column value from highlight object
 */
function getColumnValue(
  highlight: Highlight,
  column: string,
  options: CSVExportOptions
): string | number {
  const dateFormat = options.dateFormat || 'yyyy-MM-dd HH:mm:ss'

  switch (column.toLowerCase()) {
    case 'id':
      return highlight.id
    case 'source_title':
    case 'source':
      return highlight.sourceTitle || ''
    case 'source_author':
    case 'author':
      return highlight.sourceAuthor || ''
    case 'source_type':
    case 'type':
      return highlight.sourceType || ''
    case 'highlight_text':
    case 'text':
    case 'highlight':
      return highlight.text || ''
    case 'note':
    case 'notes':
      return highlight.note || ''
    case 'location':
      return getLocationValue(highlight.location)
    case 'page':
      return getLocationPage(highlight.location)
    case 'color':
      return highlight.color || ''
    case 'date':
    case 'date_highlighted':
    case 'highlighted_at':
      return format(new Date(highlight.highlightedAt), dateFormat)
    case 'tags':
      return highlight.tags ? highlight.tags.join('; ') : ''
    case 'is_favorite':
    case 'favorite':
      return highlight.isFavorite ? 'Yes' : 'No'
    case 'is_archived':
    case 'archived':
      return highlight.isArchived ? 'Yes' : 'No'
    default:
      return ''
  }
}
