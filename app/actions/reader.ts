'use server'

import { revalidatePath } from 'next/cache'
import { parseArticle, isArticleError } from '@/lib/parsers/article-parser'
import { createSource, updateSource, getSourceById } from '@/lib/db/highlight-sources-store'
import { createHighlightWithLocation, CreateHighlightWithLocationDTO, getHighlights } from '@/lib/db/highlights-store'

// ============================================
// READER ACTIONS
// ============================================

/**
 * Create a source from a URL by parsing the article content
 * @param url - The URL of the article to parse and save
 * @returns Success with sourceId or error
 */
export async function createSourceFromUrlAction(url: string) {
  try {
    // Validate URL format
    if (!url || typeof url !== 'string') {
      return { success: false, error: 'Invalid URL provided' }
    }

    // Parse the article
    const parseResult = await parseArticle(url)

    // Check if parsing failed
    if (isArticleError(parseResult)) {
      return {
        success: false,
        error: parseResult.error,
        details: parseResult.details,
      }
    }

    // Create source with basic info
    const source = await createSource({
      sourceType: 'web_article',
      title: parseResult.title,
      author: parseResult.author || undefined,
      url: parseResult.url,
      domain: parseResult.domain,
      publishedDate: parseResult.publishedDate || undefined,
      content: parseResult.content,
      excerpt: parseResult.excerpt || undefined,
    })

    // Update source with reader-specific fields
    await updateSource(source.id, {
      // Store full content in both fields for flexibility
      content: parseResult.content,
      excerpt: parseResult.excerpt || undefined,
    })

    // Note: full_content, full_content_html, word_count, reading_time_minutes
    // are in the schema but not yet in the TypeScript interface.
    // These will need to be added to the HighlightSource type and updateSource function
    // For now, we'll use a direct query approach
    const { Pool } = require('pg')
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      ssl: false,
    })

    await pool.query(
      `UPDATE sources
       SET full_content = $1,
           full_content_html = $2,
           word_count = $3,
           reading_time_minutes = $4,
           updated_at = NOW()
       WHERE id = $5`,
      [
        parseResult.content,
        parseResult.content, // HTML content (article parser returns cleaned HTML in content field)
        parseResult.wordCount,
        parseResult.readingTimeMinutes,
        source.id,
      ]
    )

    await pool.end()

    revalidatePath('/highlights')
    revalidatePath('/highlights/reader')

    return {
      success: true,
      sourceId: source.id,
      source: {
        id: source.id,
        title: parseResult.title,
        author: parseResult.author,
        url: parseResult.url,
        wordCount: parseResult.wordCount,
        readingTimeMinutes: parseResult.readingTimeMinutes,
      },
    }
  } catch (error) {
    console.error('Error creating source from URL:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create source from URL',
    }
  }
}

/**
 * Create a highlight from a text selection in the reader
 * @param data - Highlight data including sourceId, text, note, color, and location
 * @returns Success with highlightId or error
 */
export async function createHighlightFromSelectionAction(data: {
  sourceId: number
  text: string
  note?: string | null
  color?: string
  location?: Record<string, any> | null
}) {
  try {
    // Validate required fields
    if (!data.sourceId || !data.text) {
      return { success: false, error: 'Source ID and text are required' }
    }

    // Validate text length
    if (data.text.trim().length === 0) {
      return { success: false, error: 'Highlight text cannot be empty' }
    }

    // Create highlight with location data
    const highlightData: CreateHighlightWithLocationDTO = {
      sourceId: data.sourceId,
      text: data.text.trim(),
      note: data.note || null,
      color: data.color || 'yellow',
      location: data.location || null,
      highlightedAt: new Date().toISOString(),
    }

    const highlight = await createHighlightWithLocation(highlightData)

    revalidatePath('/highlights')
    revalidatePath('/highlights/reader')
    revalidatePath(`/highlights/read/${data.sourceId}`)

    return {
      success: true,
      highlightId: highlight.id,
      highlight: {
        id: highlight.id,
        text: highlight.text,
        note: highlight.note,
        color: highlight.color,
        location: highlight.location,
      },
    }
  } catch (error) {
    console.error('Error creating highlight from selection:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create highlight',
    }
  }
}

/**
 * Update reading progress for a source
 * @param sourceId - The ID of the source
 * @param position - Reading position (0-100 percentage or scroll offset)
 * @returns Success or error
 */
export async function updateReadingProgressAction(sourceId: number, position: number) {
  try {
    if (!sourceId || typeof position !== 'number') {
      return { success: false, error: 'Invalid source ID or position' }
    }

    if (position < 0 || position > 100) {
      return { success: false, error: 'Position must be between 0 and 100' }
    }

    // Update reading_position and last_read_at using direct query
    // since these fields are not yet in the TypeScript interface
    const { Pool } = require('pg')
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      ssl: false,
    })

    await pool.query(
      `UPDATE sources
       SET reading_position = $1,
           last_read_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [position, sourceId]
    )

    await pool.end()

    revalidatePath('/highlights/reader')
    revalidatePath(`/highlights/read/${sourceId}`)

    return { success: true, position }
  } catch (error) {
    console.error('Error updating reading progress:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update reading progress',
    }
  }
}

/**
 * Mark a source as read or unread
 * @param sourceId - The ID of the source
 * @param isRead - Whether the source is read
 * @returns Success or error
 */
export async function markAsReadAction(sourceId: number, isRead: boolean) {
  try {
    if (!sourceId) {
      return { success: false, error: 'Invalid source ID' }
    }

    // Update is_read field using direct query
    const { Pool } = require('pg')
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      ssl: false,
    })

    await pool.query(
      `UPDATE sources
       SET is_read = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [isRead, sourceId]
    )

    await pool.end()

    revalidatePath('/highlights/reader')
    revalidatePath(`/highlights/read/${sourceId}`)

    return { success: true, isRead }
  } catch (error) {
    console.error('Error marking source as read:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark as read',
    }
  }
}

/**
 * Get a source with all reader fields and its highlights
 * @param sourceId - The ID of the source
 * @returns Source data with highlights or error
 */
export async function getReaderSourceAction(sourceId: number) {
  try {
    if (!sourceId) {
      return { success: false, error: 'Invalid source ID' }
    }

    // Get source basic info
    const source = await getSourceById(sourceId)

    if (!source) {
      return { success: false, error: 'Source not found' }
    }

    // Get reader-specific fields using direct query
    const { Pool } = require('pg')
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      ssl: false,
    })

    const readerResult = await pool.query(
      `SELECT
        full_content,
        full_content_html,
        word_count,
        reading_time_minutes,
        is_read,
        reading_position,
        last_read_at
       FROM sources
       WHERE id = $1`,
      [sourceId]
    )

    await pool.end()

    const readerData = readerResult.rows[0] || {}

    // Get highlights for this source
    const highlights = await getHighlights({
      sourceId,
      limit: 1000, // Get all highlights for the source
    })

    return {
      success: true,
      source: {
        ...source,
        fullContent: readerData.full_content,
        fullContentHtml: readerData.full_content_html,
        wordCount: readerData.word_count,
        readingTimeMinutes: readerData.reading_time_minutes,
        isRead: readerData.is_read || false,
        readingPosition: readerData.reading_position || 0,
        lastReadAt: readerData.last_read_at?.toISOString() || null,
      },
      highlights: highlights.map((h) => ({
        id: h.id,
        text: h.text,
        note: h.note,
        color: h.color,
        location: h.location,
        highlightedAt: h.highlightedAt,
      })),
    }
  } catch (error) {
    console.error('Error getting reader source:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get source',
    }
  }
}

/**
 * Get all sources with reader content
 * @returns List of sources with reader metadata
 */
export async function getReaderSourcesAction() {
  try {
    const { Pool } = require('pg')
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      ssl: false,
    })

    const result = await pool.query(
      `SELECT
        id,
        title,
        author,
        url,
        domain,
        source_type,
        word_count,
        reading_time_minutes,
        is_read,
        reading_position,
        last_read_at,
        created_at,
        excerpt
       FROM sources
       WHERE (full_content IS NOT NULL OR content IS NOT NULL)
       ORDER BY
         CASE
           WHEN last_read_at IS NOT NULL THEN last_read_at
           ELSE created_at
         END DESC`,
      []
    )

    await pool.end()

    return {
      success: true,
      sources: result.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        author: row.author,
        url: row.url,
        domain: row.domain,
        sourceType: row.source_type,
        wordCount: row.word_count || 0,
        readingTimeMinutes: row.reading_time_minutes || 0,
        isRead: row.is_read || false,
        readingPosition: row.reading_position || 0,
        lastReadAt: row.last_read_at?.toISOString() || null,
        createdAt: row.created_at.toISOString(),
        excerpt: row.excerpt || '',
      })),
    }
  } catch (error) {
    console.error('Error getting reader sources:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get reader sources',
      sources: [],
    }
  }
}
