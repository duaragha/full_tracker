// ============================================
// OneNote Exporter
// Export highlights to Microsoft OneNote using Graph API
// ============================================

import { ExportOptions, ExportResult, Highlight, OneNoteConfig } from './types'
import { getHighlights } from '@/lib/db/highlights-store'
import { Client } from '@microsoft/microsoft-graph-client'
import { format } from 'date-fns'
import 'isomorphic-fetch'

export interface OneNoteExportOptions extends ExportOptions {
  notebookId?: string
  sectionId?: string
  notebookName?: string
  sectionName?: string
  createNewSection?: boolean
  groupBySource?: boolean
}

interface OneNoteNotebook {
  id: string
  displayName: string
  self: string
}

interface OneNoteSection {
  id: string
  displayName: string
  parentNotebook: {
    id: string
  }
}

interface OneNotePage {
  id: string
  title: string
  self: string
  contentUrl: string
}

/**
 * Export highlights to OneNote
 */
export async function exportToOneNote(
  accessToken: string,
  options: OneNoteExportOptions = {}
): Promise<ExportResult> {
  try {
    // Create Graph client
    const client = createGraphClient(accessToken)

    // Fetch highlights
    const highlights = await getHighlights({
      highlightIds: options.highlightIds,
      sourceIds: options.sourceIds,
      tags: options.tagFilter,
      limit: 10000
    })

    if (highlights.length === 0) {
      return {
        success: false,
        itemsExported: 0,
        itemsFailed: 0,
        error: 'No highlights found matching the criteria'
      }
    }

    // Get or create notebook and section
    let sectionId = options.sectionId

    if (!sectionId) {
      const notebookId = options.notebookId || await getOrCreateNotebook(
        client,
        options.notebookName || 'My Highlights'
      )

      sectionId = await getOrCreateSection(
        client,
        notebookId,
        options.sectionName || 'Imported Highlights'
      )
    }

    // Group highlights by source if requested
    let itemsExported = 0
    let itemsFailed = 0

    if (options.groupBySource) {
      const grouped = groupBySource(highlights as Highlight[])

      for (const [sourceTitle, sourceHighlights] of grouped.entries()) {
        try {
          await createOneNotePage(
            client,
            sectionId,
            sourceTitle,
            sourceHighlights
          )
          itemsExported += sourceHighlights.length
        } catch (error) {
          console.error(`Failed to export source ${sourceTitle}:`, error)
          itemsFailed += sourceHighlights.length
        }
      }
    } else {
      // Create a single page with all highlights
      try {
        await createOneNotePage(
          client,
          sectionId,
          `Highlights - ${format(new Date(), 'MMM d, yyyy')}`,
          highlights as Highlight[]
        )
        itemsExported = highlights.length
      } catch (error) {
        console.error('Failed to create OneNote page:', error)
        itemsFailed = highlights.length
      }
    }

    return {
      success: itemsExported > 0,
      itemsExported,
      itemsFailed,
      outputUrl: `https://www.onenote.com/sections/${sectionId}`
    }
  } catch (error) {
    console.error('OneNote export error:', error)
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
 * Create Microsoft Graph API client
 */
function createGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken)
    }
  })
}

/**
 * Get or create a OneNote notebook
 */
async function getOrCreateNotebook(
  client: Client,
  notebookName: string
): Promise<string> {
  try {
    // Try to find existing notebook
    const notebooks = await client
      .api('/me/onenote/notebooks')
      .get()

    const existing = notebooks.value.find(
      (nb: OneNoteNotebook) => nb.displayName === notebookName
    )

    if (existing) {
      return existing.id
    }

    // Create new notebook
    const newNotebook = await client
      .api('/me/onenote/notebooks')
      .post({
        displayName: notebookName
      })

    return newNotebook.id
  } catch (error) {
    console.error('Error getting/creating notebook:', error)
    throw new Error('Failed to access OneNote notebook')
  }
}

/**
 * Get or create a section in a notebook
 */
async function getOrCreateSection(
  client: Client,
  notebookId: string,
  sectionName: string
): Promise<string> {
  try {
    // Try to find existing section
    const sections = await client
      .api(`/me/onenote/notebooks/${notebookId}/sections`)
      .get()

    const existing = sections.value.find(
      (section: OneNoteSection) => section.displayName === sectionName
    )

    if (existing) {
      return existing.id
    }

    // Create new section
    const newSection = await client
      .api(`/me/onenote/notebooks/${notebookId}/sections`)
      .post({
        displayName: sectionName
      })

    return newSection.id
  } catch (error) {
    console.error('Error getting/creating section:', error)
    throw new Error('Failed to access OneNote section')
  }
}

/**
 * Create a OneNote page with highlights
 */
async function createOneNotePage(
  client: Client,
  sectionId: string,
  pageTitle: string,
  highlights: Highlight[]
): Promise<OneNotePage> {
  // Generate HTML content for the page
  const htmlContent = generateOneNoteHTML(pageTitle, highlights)

  try {
    const page = await client
      .api(`/me/onenote/sections/${sectionId}/pages`)
      .header('Content-Type', 'text/html')
      .post(htmlContent)

    return page
  } catch (error) {
    console.error('Error creating OneNote page:', error)
    throw new Error('Failed to create OneNote page')
  }
}

/**
 * Generate OneNote-compatible HTML
 */
function generateOneNoteHTML(title: string, highlights: Highlight[]): string {
  let html = `
<!DOCTYPE html>
<html>
  <head>
    <title>${escapeHTML(title)}</title>
    <meta name="created" content="${new Date().toISOString()}" />
  </head>
  <body>
    <h1>${escapeHTML(title)}</h1>
    <p><em>Exported on ${format(new Date(), 'MMMM d, yyyy')}</em></p>
    <p><strong>Total highlights: ${highlights.length}</strong></p>
    <hr />
`

  highlights.forEach((highlight, index) => {
    html += `
    <div style="margin-bottom: 20px;">
      <h3>Highlight ${index + 1}</h3>
      <blockquote style="border-left: 3px solid ${getColorCode(highlight.color || 'yellow')}; padding-left: 15px; margin-left: 0;">
        <p>${escapeHTML(highlight.text)}</p>
      </blockquote>
`

    // Add note if present
    if (highlight.note) {
      html += `
      <p><strong>Note:</strong> ${escapeHTML(highlight.note)}</p>
`
    }

    // Add metadata
    html += `
      <p style="font-size: 0.9em; color: #666;">
        <strong>Source:</strong> ${escapeHTML(highlight.sourceTitle)}
`

    if (highlight.sourceAuthor) {
      html += ` by ${escapeHTML(highlight.sourceAuthor)}`
    }

    if (highlight.location) {
      if (highlight.location.page) {
        html += ` • Page ${highlight.location.page}`
      } else if (highlight.location.location) {
        html += ` • Location ${highlight.location.location}`
      }
    }

    html += `<br />
        <strong>Date:</strong> ${format(new Date(highlight.highlightedAt), 'MMM d, yyyy')}
`

    if (highlight.tags && highlight.tags.length > 0) {
      html += `<br />
        <strong>Tags:</strong> ${highlight.tags.map(t => escapeHTML(t)).join(', ')}
`
    }

    html += `
      </p>
    </div>
    <hr />
`
  })

  html += `
  </body>
</html>
`

  return html
}

/**
 * Group highlights by source
 */
function groupBySource(highlights: Highlight[]): Map<string, Highlight[]> {
  const grouped = new Map<string, Highlight[]>()

  highlights.forEach(highlight => {
    const key = highlight.sourceAuthor
      ? `${highlight.sourceTitle} by ${highlight.sourceAuthor}`
      : highlight.sourceTitle

    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(highlight)
  })

  return grouped
}

/**
 * Escape HTML entities
 */
function escapeHTML(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}

/**
 * Get hex color code for highlight color
 */
function getColorCode(color: string): string {
  const colors: Record<string, string> = {
    yellow: '#FFF59D',
    blue: '#90CAF9',
    red: '#EF9A9A',
    green: '#A5D6A7',
    orange: '#FFCC80',
    purple: '#CE93D8',
    pink: '#F48FB1'
  }

  return colors[color.toLowerCase()] || colors.yellow
}

/**
 * Get list of available notebooks
 */
export async function listOneNoteNotebooks(accessToken: string): Promise<OneNoteNotebook[]> {
  try {
    const client = createGraphClient(accessToken)
    const notebooks = await client.api('/me/onenote/notebooks').get()
    return notebooks.value
  } catch (error) {
    console.error('Error listing notebooks:', error)
    throw new Error('Failed to list OneNote notebooks')
  }
}

/**
 * Get list of sections in a notebook
 */
export async function listOneNoteSections(
  accessToken: string,
  notebookId: string
): Promise<OneNoteSection[]> {
  try {
    const client = createGraphClient(accessToken)
    const sections = await client
      .api(`/me/onenote/notebooks/${notebookId}/sections`)
      .get()
    return sections.value
  } catch (error) {
    console.error('Error listing sections:', error)
    throw new Error('Failed to list OneNote sections')
  }
}

/**
 * Validate OneNote access token
 */
export async function validateOneNoteToken(accessToken: string): Promise<boolean> {
  try {
    const client = createGraphClient(accessToken)
    await client.api('/me/onenote/notebooks').get()
    return true
  } catch (error) {
    return false
  }
}
