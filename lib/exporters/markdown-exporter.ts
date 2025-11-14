// ============================================
// Markdown Exporter
// Export highlights to Markdown format
// ============================================

import { ExportOptions, ExportResult, Highlight, GroupedHighlights } from './types'
import { getHighlights } from '@/lib/db/highlights-store'
import { format } from 'date-fns'

export interface MarkdownExportOptions extends ExportOptions {
  groupBy?: 'source' | 'date' | 'tag' | 'none'
  singleFile?: boolean
  includeTableOfContents?: boolean
  includeSourceMetadata?: boolean
}

/**
 * Export highlights to Markdown format
 */
export async function exportToMarkdown(
  options: MarkdownExportOptions = {}
): Promise<ExportResult> {
  try {
    // Fetch highlights based on filters
    const highlights = await fetchHighlightsForExport(options)

    if (highlights.length === 0) {
      return {
        success: false,
        itemsExported: 0,
        itemsFailed: 0,
        error: 'No highlights found matching the criteria'
      }
    }

    // Generate markdown content
    const markdownContent = generateMarkdownContent(highlights, options)

    // Return the content (in practice, this would be saved to a file)
    return {
      success: true,
      itemsExported: highlights.length,
      itemsFailed: 0,
      outputPath: markdownContent
    }
  } catch (error) {
    console.error('Markdown export error:', error)
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
 * Fetch highlights for export based on options
 */
async function fetchHighlightsForExport(
  options: MarkdownExportOptions
): Promise<Highlight[]> {
  const highlights = await getHighlights({
    highlightIds: options.highlightIds,
    sourceIds: options.sourceIds,
    tags: options.tagFilter,
    limit: 10000 // Get all matching highlights
  })

  return highlights as Highlight[]
}

/**
 * Generate markdown content from highlights
 */
function generateMarkdownContent(
  highlights: Highlight[],
  options: MarkdownExportOptions
): string {
  const { groupBy = 'source', includeTableOfContents = true, includeSourceMetadata = true } = options

  let markdown = ''

  // Add title
  markdown += `# My Highlights\n\n`
  markdown += `Exported on ${format(new Date(), 'MMMM d, yyyy')}\n\n`
  markdown += `Total highlights: ${highlights.length}\n\n`

  // Group highlights
  const grouped = groupHighlights(highlights, groupBy)

  // Add table of contents if requested
  if (includeTableOfContents && groupBy !== 'none') {
    markdown += `## Table of Contents\n\n`
    Object.keys(grouped).forEach((key, index) => {
      const title = getGroupTitle(key, groupBy, grouped[key])
      markdown += `${index + 1}. [${title}](#${slugify(title)})\n`
    })
    markdown += `\n---\n\n`
  }

  // Add grouped highlights
  Object.entries(grouped).forEach(([key, group]) => {
    const title = getGroupTitle(key, groupBy, group)
    markdown += `## ${title}\n\n`

    // Add source metadata if grouped by source
    if (groupBy === 'source' && includeSourceMetadata && group.highlights.length > 0) {
      const first = group.highlights[0]
      if (first.sourceAuthor) {
        markdown += `**Author:** ${first.sourceAuthor}\n\n`
      }
      markdown += `**Source Type:** ${first.sourceType}\n\n`
      markdown += `**Highlights:** ${group.highlights.length}\n\n`
      markdown += `---\n\n`
    }

    // Add each highlight
    group.highlights.forEach((highlight, index) => {
      // Highlight text
      markdown += `### Highlight ${index + 1}\n\n`
      markdown += `> ${highlight.text}\n\n`

      // Note if present
      if (highlight.note && options.includeNotes !== false) {
        markdown += `**Note:** ${highlight.note}\n\n`
      }

      // Metadata if requested
      if (options.includeMetadata !== false) {
        markdown += `*`

        // Location
        if (highlight.location) {
          if (highlight.location.page) {
            markdown += `Page ${highlight.location.page}`
          } else if (highlight.location.location) {
            markdown += `Location ${highlight.location.location}`
          }
          markdown += ` • `
        }

        // Date
        markdown += `${format(new Date(highlight.highlightedAt), 'MMM d, yyyy')}`

        // Source (if not grouped by source)
        if (groupBy !== 'source') {
          markdown += ` • ${highlight.sourceTitle}`
          if (highlight.sourceAuthor) {
            markdown += ` by ${highlight.sourceAuthor}`
          }
        }

        // Tags
        if (highlight.tags && highlight.tags.length > 0) {
          markdown += ` • Tags: ${highlight.tags.join(', ')}`
        }

        markdown += `*\n\n`
      }

      markdown += `---\n\n`
    })

    markdown += `\n`
  })

  return markdown
}

/**
 * Group highlights based on criteria
 */
function groupHighlights(
  highlights: Highlight[],
  groupBy: 'source' | 'date' | 'tag' | 'none'
): GroupedHighlights {
  const grouped: GroupedHighlights = {}

  if (groupBy === 'none') {
    grouped['all'] = {
      source: {
        id: 0,
        title: 'All Highlights',
        type: 'mixed'
      },
      highlights
    }
    return grouped
  }

  highlights.forEach(highlight => {
    let key: string

    switch (groupBy) {
      case 'source':
        key = `${highlight.sourceId}|${highlight.sourceTitle}`
        break
      case 'date':
        key = format(new Date(highlight.highlightedAt), 'yyyy-MM')
        break
      case 'tag':
        // If highlight has tags, create a group for each tag
        if (highlight.tags && highlight.tags.length > 0) {
          highlight.tags.forEach(tag => {
            const tagKey = `tag:${tag}`
            if (!grouped[tagKey]) {
              grouped[tagKey] = {
                source: {
                  id: 0,
                  title: tag,
                  type: 'tag'
                },
                highlights: []
              }
            }
            grouped[tagKey].highlights.push(highlight)
          })
          return
        } else {
          key = 'tag:untagged'
        }
        break
      default:
        key = 'all'
    }

    if (!grouped[key]) {
      grouped[key] = {
        source: {
          id: highlight.sourceId,
          title: highlight.sourceTitle,
          author: highlight.sourceAuthor,
          type: highlight.sourceType
        },
        highlights: []
      }
    }

    grouped[key].highlights.push(highlight)
  })

  return grouped
}

/**
 * Get display title for a group
 */
function getGroupTitle(
  key: string,
  groupBy: 'source' | 'date' | 'tag' | 'none',
  group: { source: any; highlights: Highlight[] }
): string {
  switch (groupBy) {
    case 'source':
      return group.source.author
        ? `${group.source.title} by ${group.source.author}`
        : group.source.title
    case 'date':
      return format(new Date(key + '-01'), 'MMMM yyyy')
    case 'tag':
      return group.source.title
    case 'none':
      return 'All Highlights'
    default:
      return key
  }
}

/**
 * Create URL-friendly slug from title
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

/**
 * Export highlights grouped by source to multiple files
 */
export async function exportToMarkdownBySource(
  options: MarkdownExportOptions = {}
): Promise<Map<string, string>> {
  const highlights = await fetchHighlightsForExport(options)
  const grouped = groupHighlights(highlights, 'source')
  const files = new Map<string, string>()

  Object.entries(grouped).forEach(([key, group]) => {
    const filename = slugify(group.source.title) + '.md'
    const content = generateMarkdownContent(group.highlights, {
      ...options,
      groupBy: 'none',
      includeTableOfContents: false
    })
    files.set(filename, content)
  })

  return files
}
