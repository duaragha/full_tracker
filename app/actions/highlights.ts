'use server'

import {
  CreateSourceDTO,
  CreateHighlightDTO,
  UpdateHighlightDTO,
  SearchFilters,
} from '@/types/highlight'
import {
  getSources,
  getSourceById,
  createSource,
  updateSource,
  deleteSource,
} from '@/lib/db/highlight-sources-store'
import {
  getHighlights,
  getHighlightById,
  createHighlight,
  updateHighlight,
  deleteHighlight,
  getHighlightsCount,
} from '@/lib/db/highlights-store'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  getDueReviews,
  updateReviewResult,
  getReviewStats,
  getReviewByHighlightId,
  createReview,
  resetReview,
} from '@/lib/db/highlight-reviews-store'

// ============================================
// SOURCE ACTIONS
// ============================================

export async function getSourcesAction(filters?: {
  sourceType?: string
  bookId?: number
  search?: string
  limit?: number
  offset?: number
}) {
  return await getSources(filters)
}

export async function getSourceByIdAction(id: number) {
  return await getSourceById(id)
}

export async function createSourceAction(source: CreateSourceDTO) {
  const result = await createSource(source)
  revalidatePath('/highlights')
  return result
}

export async function updateSourceAction(id: number, updates: Partial<CreateSourceDTO>) {
  await updateSource(id, updates as any)
  revalidatePath('/highlights')
  revalidatePath(`/highlights/sources/${id}`)
}

export async function deleteSourceAction(id: number) {
  await deleteSource(id)
  revalidatePath('/highlights')
}

// ============================================
// HIGHLIGHT ACTIONS
// ============================================

export async function getHighlightsAction(filters?: SearchFilters & {
  limit?: number
  offset?: number
}) {
  return await getHighlights(filters)
}

export async function getHighlightByIdAction(id: number) {
  return await getHighlightById(id)
}

export async function createHighlightAction(highlight: CreateHighlightDTO) {
  const result = await createHighlight(highlight)
  revalidatePath('/highlights')
  revalidatePath(`/highlights/sources/${highlight.sourceId}`)
  return result
}

export async function updateHighlightAction(id: number, updates: UpdateHighlightDTO) {
  const highlight = await getHighlightById(id)
  if (!highlight) throw new Error('Highlight not found')

  await updateHighlight(id, updates)
  revalidatePath('/highlights')
  revalidatePath(`/highlights/sources/${highlight.sourceId}`)
}

export async function deleteHighlightAction(id: number) {
  const highlight = await getHighlightById(id)
  if (highlight) {
    await deleteHighlight(id)
    revalidatePath('/highlights')
    revalidatePath(`/highlights/sources/${highlight.sourceId}`)
  }
}

export async function getHighlightsCountAction(filters?: SearchFilters) {
  return await getHighlightsCount(filters)
}

// ============================================
// IMPORT ACTIONS
// ============================================

export interface KindleImportStats {
  totalHighlights: number
  highlightsImported: number
  sourcesCreated: number
  duplicatesSkipped: number
  errors: Array<{ line: number; message: string; context?: string }>
  books: Array<{ title: string; author: string | null; highlightCount: number }>
}

export async function importKindleAction(fileContent: string): Promise<KindleImportStats> {
  const { parseKindleClippings, deduplicateHighlights, groupHighlightsByBook } = await import('@/lib/parsers/kindle-parser')
  const crypto = await import('crypto')

  // Parse the file
  const parseResult = parseKindleClippings(fileContent)

  // Deduplicate highlights
  const uniqueHighlights = deduplicateHighlights(parseResult.highlights)

  // Group by book
  const highlightsByBook = groupHighlightsByBook(uniqueHighlights)

  const stats: KindleImportStats = {
    totalHighlights: parseResult.highlights.length,
    highlightsImported: 0,
    sourcesCreated: 0,
    duplicatesSkipped: 0,
    errors: parseResult.errors,
    books: [],
  }

  // Import each book and its highlights
  for (const [bookKey, bookHighlights] of highlightsByBook) {
    const [title, author] = bookKey.split('|')

    try {
      // Check if source already exists (by title and author)
      const existingSources = await getSources({
        search: title,
        sourceType: 'kindle',
        limit: 100,
      })

      let source = existingSources.find(
        s => s.title === title && (s.author === author || (!s.author && author === 'Unknown'))
      )

      // Create source if it doesn't exist
      if (!source) {
        source = await createSource({
          sourceType: 'kindle',
          title,
          author: author === 'Unknown' ? undefined : author,
        })
        stats.sourcesCreated++
      }

      // Import highlights for this source
      const existingHighlights = await getHighlights({
        sourceId: source.id,
        limit: 10000, // Get all existing highlights for this source
      })

      // Create a set of existing highlight hashes for duplicate detection
      const existingHashes = new Set(
        existingHighlights
          .map(h => crypto.createHash('sha256').update(h.text).digest('hex'))
      )

      for (const highlight of bookHighlights) {
        // Check for duplicates using content hash
        const contentHash = crypto.createHash('sha256').update(highlight.highlightText).digest('hex')

        if (existingHashes.has(contentHash)) {
          stats.duplicatesSkipped++
          continue
        }

        // Build location object for JSONB field
        const location: Record<string, any> = {}
        if (highlight.location) {
          location.location = highlight.location
        }
        if (highlight.page) {
          location.page = highlight.page
        }

        // Create highlight using direct database query to match schema
        const { createHighlightWithLocation } = await import('@/lib/db/highlights-store')
        await createHighlightWithLocation({
          sourceId: source.id,
          text: highlight.highlightText,
          note: null,
          location: Object.keys(location).length > 0 ? location : null,
          color: 'yellow',
          highlightedAt: highlight.date?.toISOString() || new Date().toISOString(),
        })

        stats.highlightsImported++
        existingHashes.add(contentHash)
      }

      stats.books.push({
        title,
        author: author === 'Unknown' ? null : author,
        highlightCount: bookHighlights.length,
      })
    } catch (error) {
      stats.errors.push({
        line: 0,
        message: `Failed to import book "${title}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        context: bookKey,
      })
    }
  }

  revalidatePath('/highlights')
  revalidatePath('/highlights/import')

  return stats
}

/**
 * Import Kindle highlights from HTML notebook export
 * Modern Kindle app exports HTML files instead of TXT
 */
export async function importKindleHTMLAction(fileContent: string): Promise<KindleImportStats> {
  const { parseKindleHTMLNotebook } = await import('@/lib/parsers/kindle-html-parser')
  const crypto = await import('crypto')

  // Parse the HTML file
  const parseResult = parseKindleHTMLNotebook(fileContent)

  if (!parseResult.success) {
    throw new Error(parseResult.error || 'Failed to parse Kindle HTML file')
  }

  const stats: KindleImportStats = {
    totalHighlights: parseResult.highlights.length,
    highlightsImported: 0,
    sourcesCreated: 0,
    duplicatesSkipped: 0,
    errors: [],
    books: [],
  }

  try {
    const { highlights, bookTitle, bookAuthor } = parseResult

    // Check if source already exists (by title and author)
    const existingSources = await getSources({
      search: bookTitle,
      sourceType: 'kindle',
      limit: 100,
    })

    let source = existingSources.find(
      s => s.title === bookTitle && (s.author === bookAuthor || (!s.author && bookAuthor === 'Unknown Author'))
    )

    // Create source if it doesn't exist
    if (!source) {
      source = await createSource({
        sourceType: 'kindle',
        title: bookTitle,
        author: bookAuthor === 'Unknown Author' ? undefined : bookAuthor,
      })
      stats.sourcesCreated++
    }

    // Import highlights for this source
    const existingHighlights = await getHighlights({
      sourceId: source.id,
      limit: 10000, // Get all existing highlights for this source
    })

    // Create a set of existing highlight hashes for duplicate detection
    const existingHashes = new Set(
      existingHighlights
        .map(h => crypto.createHash('sha256').update(h.text).digest('hex'))
    )

    for (const highlight of highlights) {
      // Check for duplicates using content hash
      const contentHash = crypto.createHash('sha256').update(highlight.highlightText).digest('hex')

      if (existingHashes.has(contentHash)) {
        stats.duplicatesSkipped++
        continue
      }

      // Build location object for JSONB field
      const location: Record<string, any> = {}
      if (highlight.location) {
        location.location = highlight.location
      }
      if (highlight.page) {
        location.page = highlight.page
      }
      if (highlight.section) {
        location.section = highlight.section
      }

      // Create highlight using direct database query to match schema
      const { createHighlightWithLocation } = await import('@/lib/db/highlights-store')
      await createHighlightWithLocation({
        sourceId: source.id,
        text: highlight.highlightText,
        note: highlight.note || null,
        location: Object.keys(location).length > 0 ? location : null,
        color: highlight.color || 'yellow',
        highlightedAt: new Date().toISOString(),
      })

      stats.highlightsImported++
      existingHashes.add(contentHash)
    }

    stats.books.push({
      title: bookTitle,
      author: bookAuthor === 'Unknown Author' ? null : bookAuthor,
      highlightCount: highlights.length,
    })
  } catch (error) {
    stats.errors.push({
      line: 0,
      message: `Failed to import highlights: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }

  revalidatePath('/highlights')
  revalidatePath('/highlights/import')

  return stats
}

// ============================================
// MANUAL HIGHLIGHT CREATION
// ============================================

export async function createManualHighlightAction(formData: FormData) {
  try {
    // Extract form data
    const highlightText = formData.get('highlightText')?.toString().trim()
    const sourceTitle = formData.get('sourceTitle')?.toString().trim()
    const sourceAuthor = formData.get('sourceAuthor')?.toString().trim()
    const note = formData.get('note')?.toString().trim()
    const location = formData.get('location')?.toString().trim()
    const color = formData.get('color')?.toString() || 'yellow'

    // Validation
    if (!highlightText || highlightText.length === 0) {
      return { success: false, error: 'Highlight text is required' }
    }

    if (!sourceTitle || sourceTitle.length === 0) {
      return { success: false, error: 'Source title is required' }
    }

    // Find existing source or create new one
    const existingSources = await getSources({
      search: sourceTitle,
      sourceType: 'manual',
      limit: 10
    })

    let source
    const matchingSource = existingSources.find(
      s => s.title.toLowerCase() === sourceTitle.toLowerCase() &&
           (sourceAuthor ? s.author?.toLowerCase() === sourceAuthor.toLowerCase() : true)
    )

    if (matchingSource) {
      source = matchingSource
    } else {
      // Create new source
      const newSource: CreateSourceDTO = {
        sourceType: 'manual',
        title: sourceTitle,
        author: sourceAuthor || undefined,
      }
      source = await createSource(newSource)
    }

    // Parse location into locationType and locationValue
    let locationType: CreateHighlightDTO['locationType']
    let locationValue: number | undefined

    if (location) {
      // Try to parse different location formats
      const pageMatch = location.match(/page\s*(\d+)/i)
      const locationMatch = location.match(/location\s*(\d+)/i)
      const percentMatch = location.match(/(\d+)%/)

      if (pageMatch) {
        locationType = 'page'
        locationValue = parseInt(pageMatch[1])
      } else if (locationMatch) {
        locationType = 'kindle_location'
        locationValue = parseInt(locationMatch[1])
      } else if (percentMatch) {
        locationType = 'percentage'
        locationValue = parseInt(percentMatch[1])
      } else {
        // If it's just a number, treat it as a page
        const numMatch = location.match(/^\d+$/)
        if (numMatch) {
          locationType = 'page'
          locationValue = parseInt(location)
        }
      }
    }

    // Create the highlight
    const newHighlight: CreateHighlightDTO = {
      sourceId: source.id,
      text: highlightText,
      note: note || undefined,
      locationType,
      locationValue,
      color,
      highlightedAt: new Date().toISOString(),
    }

    await createHighlight(newHighlight)
    revalidatePath('/highlights')
    revalidatePath('/highlights/import')
  } catch (error) {
    console.error('Error creating manual highlight:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create highlight'
    }
  }

  // Redirect on success
  redirect('/highlights')
}

// ============================================
// SPACED REPETITION / REVIEW ACTIONS
// ============================================

/**
 * Get highlights due for review today
 *
 * @param limit Optional maximum number of reviews to return
 * @returns Array of highlights due for review with their review data
 */
export async function getDueReviewsAction(limit?: number) {
  try {
    return await getDueReviews(limit)
  } catch (error) {
    console.error('Error fetching due reviews:', error)
    throw new Error('Failed to fetch due reviews')
  }
}

/**
 * Submit a review rating for a highlight
 * Updates the review using SM-2 algorithm to calculate next review date
 *
 * @param highlightId ID of the highlight being reviewed
 * @param rating Quality rating from 0-5 (0=complete blackout, 5=perfect recall)
 * @returns Updated review record
 */
export async function submitReviewAction(highlightId: number, rating: number) {
  if (typeof highlightId !== 'number' || highlightId <= 0) {
    throw new Error('Invalid highlight ID')
  }

  if (typeof rating !== 'number' || rating < 0 || rating > 5) {
    throw new Error('Rating must be between 0 and 5')
  }

  try {
    const result = await updateReviewResult(highlightId, rating)
    revalidatePath('/highlights/review')
    revalidatePath('/highlights')
    return result
  } catch (error) {
    console.error('Error submitting review:', error)
    throw new Error(`Failed to submit review: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get comprehensive statistics about the review system
 *
 * @returns Statistics including counts, averages, and trends
 */
export async function getReviewStatsAction() {
  try {
    return await getReviewStats()
  } catch (error) {
    console.error('Error fetching review stats:', error)
    throw new Error('Failed to fetch review statistics')
  }
}

/**
 * Get review data for a specific highlight
 *
 * @param highlightId ID of the highlight
 * @returns Review record or null if not found
 */
export async function getReviewByHighlightIdAction(highlightId: number) {
  try {
    return await getReviewByHighlightId(highlightId)
  } catch (error) {
    console.error('Error fetching review:', error)
    throw new Error('Failed to fetch review data')
  }
}

/**
 * Create a new review entry for a highlight
 * Useful when adding spaced repetition to an existing highlight
 *
 * @param highlightId ID of the highlight
 * @returns Created review record
 */
export async function createReviewAction(highlightId: number) {
  if (typeof highlightId !== 'number' || highlightId <= 0) {
    throw new Error('Invalid highlight ID')
  }

  try {
    const result = await createReview(highlightId)
    revalidatePath('/highlights/review')
    revalidatePath('/highlights')
    return result
  } catch (error) {
    console.error('Error creating review:', error)
    throw new Error('Failed to create review entry')
  }
}

/**
 * Reset a review back to initial state
 * Useful when user wants to restart spaced repetition for a highlight
 *
 * @param highlightId ID of the highlight
 * @returns Updated review record
 */
export async function resetReviewAction(highlightId: number) {
  if (typeof highlightId !== 'number' || highlightId <= 0) {
    throw new Error('Invalid highlight ID')
  }

  try {
    const result = await resetReview(highlightId)
    revalidatePath('/highlights/review')
    revalidatePath('/highlights')
    return result
  } catch (error) {
    console.error('Error resetting review:', error)
    throw new Error('Failed to reset review')
  }
}

// ============================================
// WEB ARTICLE ACTIONS
// ============================================

/**
 * Save a web article from a URL
 * Fetches and parses the article content, then creates a source
 *
 * @param url URL of the article to save
 * @returns Success status with source data or error information
 */
export async function saveArticleAction(url: string) {
  const { parseArticle, isArticleError } = await import('@/lib/parsers/article-parser')

  try {
    // Parse the article
    const result = await parseArticle(url)

    // Check if parsing failed
    if (isArticleError(result)) {
      return {
        success: false,
        error: result.error,
        details: result.details
      }
    }

    // Create a source with the parsed article data
    const source = await createSource({
      sourceType: 'web_article',
      title: result.title,
      author: result.author || undefined,
      url: result.url,
      domain: result.domain,
      content: result.content,
      excerpt: result.excerpt || undefined,
      publishedDate: result.publishedDate || undefined,
    })

    revalidatePath('/highlights')

    return {
      success: true,
      source,
      wordCount: result.wordCount,
      readingTimeMinutes: result.readingTimeMinutes
    }
  } catch (error) {
    console.error('Error saving article:', error)
    return {
      success: false,
      error: 'Failed to save article',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
