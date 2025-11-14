'use server'

import { revalidatePath } from 'next/cache'
import {
  saveCredentials,
  getCredentials,
  deleteCredentials,
  hasCredentials,
  updateSyncStatus,
  getSyncLogs,
  getLastSyncLog,
  createSyncLog,
  updateSyncLog,
} from '@/lib/db/amazon-credentials-store'
import { scrapeKindleHighlights } from '@/lib/scrapers/amazon-kindle-scraper'
import { getSources, createSource } from '@/lib/db/highlight-sources-store'
import { getHighlights, createHighlightWithLocation } from '@/lib/db/highlights-store'
import crypto from 'crypto'

// ============================================
// CREDENTIALS ACTIONS
// ============================================

/**
 * Save Amazon credentials (encrypted)
 *
 * @param email - Amazon email address
 * @param password - Amazon password
 * @returns Success status
 */
export async function saveAmazonCredentialsAction(email: string, password: string) {
  try {
    if (!email || !password) {
      return {
        success: false,
        error: 'Email and password are required',
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: 'Invalid email format',
      }
    }

    // Validate password length
    if (password.length < 6) {
      return {
        success: false,
        error: 'Password must be at least 6 characters',
      }
    }

    const result = await saveCredentials(email, password)

    revalidatePath('/highlights')
    revalidatePath('/highlights/import')

    return {
      success: true,
      id: result.id,
    }
  } catch (error) {
    console.error('Error saving Amazon credentials:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save credentials',
    }
  }
}

/**
 * Check if Amazon credentials exist
 *
 * @returns True if credentials are stored
 */
export async function hasAmazonCredentialsAction(): Promise<boolean> {
  try {
    return await hasCredentials()
  } catch (error) {
    console.error('Error checking Amazon credentials:', error)
    return false
  }
}

/**
 * Delete Amazon credentials
 *
 * @returns Success status
 */
export async function deleteAmazonCredentialsAction() {
  try {
    const deleted = await deleteCredentials()

    revalidatePath('/highlights')
    revalidatePath('/highlights/import')

    return {
      success: deleted,
    }
  } catch (error) {
    console.error('Error deleting Amazon credentials:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete credentials',
    }
  }
}

// ============================================
// SYNC ACTIONS
// ============================================

export interface KindleSyncResult {
  success: boolean
  highlightsImported: number
  sourcesCreated: number
  duplicatesSkipped: number
  booksProcessed: number
  error?: string
  errorType?: 'credentials' | 'login' | 'captcha' | '2fa' | 'network' | 'parsing' | 'unknown'
  durationSeconds?: number
}

/**
 * Sync Kindle highlights from Amazon
 * Scrapes read.amazon.com/notebook and imports all highlights
 *
 * @returns Sync result with statistics
 */
export async function syncKindleHighlightsAction(): Promise<KindleSyncResult> {
  const startTime = Date.now()
  let logId: number | undefined

  try {
    console.log('[Kindle Sync] Starting sync...')

    // Create sync log
    logId = await createSyncLog('in_progress')

    // Update credentials sync status
    await updateSyncStatus('in_progress')

    // Get stored credentials
    const credentials = await getCredentials()

    if (!credentials) {
      await updateSyncStatus('failed', 'No credentials found')
      if (logId) {
        await updateSyncLog(logId, {
          status: 'failed',
          errorMessage: 'No credentials found',
          durationSeconds: Math.round((Date.now() - startTime) / 1000),
        })
      }
      return {
        success: false,
        highlightsImported: 0,
        sourcesCreated: 0,
        duplicatesSkipped: 0,
        booksProcessed: 0,
        error: 'No Amazon credentials found. Please add your credentials first.',
        errorType: 'credentials',
      }
    }

    console.log('[Kindle Sync] Credentials found, starting scraper...')

    // Run the scraper
    const scrapeResult = await scrapeKindleHighlights(credentials.email, credentials.password, {
      headless: true,
      timeout: 60000,
    })

    console.log(`[Kindle Sync] Scraper completed. Success: ${scrapeResult.success}`)

    if (!scrapeResult.success) {
      await updateSyncStatus('failed', scrapeResult.error)
      if (logId) {
        await updateSyncLog(logId, {
          status: 'failed',
          errorMessage: scrapeResult.error || 'Scraping failed',
          errorDetails: { errorType: scrapeResult.errorType },
          durationSeconds: Math.round((Date.now() - startTime) / 1000),
        })
      }
      return {
        success: false,
        highlightsImported: 0,
        sourcesCreated: 0,
        duplicatesSkipped: 0,
        booksProcessed: 0,
        error: scrapeResult.error || 'Failed to scrape highlights',
        errorType: scrapeResult.errorType || 'unknown',
      }
    }

    console.log(`[Kindle Sync] Processing ${scrapeResult.highlights.length} highlights from ${scrapeResult.booksCount || 0} books`)

    // Group highlights by book
    const highlightsByBook = new Map<string, typeof scrapeResult.highlights>()
    for (const highlight of scrapeResult.highlights) {
      const key = `${highlight.bookTitle}|${highlight.bookAuthor}`
      if (!highlightsByBook.has(key)) {
        highlightsByBook.set(key, [])
      }
      highlightsByBook.get(key)!.push(highlight)
    }

    // Import highlights
    let highlightsImported = 0
    let sourcesCreated = 0
    let duplicatesSkipped = 0
    const booksProcessed: any[] = []

    for (const [bookKey, bookHighlights] of highlightsByBook) {
      const [title, author] = bookKey.split('|')

      try {
        console.log(`[Kindle Sync] Processing book: ${title}`)

        // Check if source already exists
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
          console.log(`[Kindle Sync] Creating new source: ${title}`)
          source = await createSource({
            sourceType: 'kindle',
            title,
            author: author === 'Unknown' ? undefined : author,
          })
          sourcesCreated++
        }

        // Get existing highlights for duplicate detection
        const existingHighlights = await getHighlights({
          sourceId: source.id,
          limit: 10000,
        })

        const existingHashes = new Set(
          existingHighlights.map(h =>
            crypto.createHash('sha256').update(h.text).digest('hex')
          )
        )

        // Import highlights
        let bookHighlightsImported = 0
        for (const highlight of bookHighlights) {
          // Check for duplicates
          const contentHash = crypto.createHash('sha256').update(highlight.highlightText).digest('hex')

          if (existingHashes.has(contentHash)) {
            duplicatesSkipped++
            continue
          }

          // Build location object
          const location: Record<string, any> = {}
          if (highlight.location) {
            location.location = highlight.location
          }
          if (highlight.page) {
            location.page = highlight.page
          }

          // Create highlight
          await createHighlightWithLocation({
            sourceId: source.id,
            text: highlight.highlightText,
            note: highlight.note || null,
            location: Object.keys(location).length > 0 ? location : null,
            color: 'yellow',
            highlightedAt: highlight.date?.toISOString() || new Date().toISOString(),
          })

          highlightsImported++
          bookHighlightsImported++
          existingHashes.add(contentHash)
        }

        console.log(`[Kindle Sync] Imported ${bookHighlightsImported} highlights from ${title}`)

        booksProcessed.push({
          title,
          author,
          highlightsCount: bookHighlights.length,
          highlightsImported: bookHighlightsImported,
        })
      } catch (error) {
        console.error(`[Kindle Sync] Error processing book ${title}:`, error)
        // Continue with next book
      }
    }

    const durationSeconds = Math.round((Date.now() - startTime) / 1000)

    // Update sync status
    await updateSyncStatus('success')

    // Update sync log
    if (logId) {
      await updateSyncLog(logId, {
        status: 'success',
        highlightsImported,
        sourcesCreated,
        duplicatesSkipped,
        booksProcessed,
        durationSeconds,
      })
    }

    // Revalidate paths
    revalidatePath('/highlights')
    revalidatePath('/highlights/import')

    console.log('[Kindle Sync] Sync completed successfully')
    console.log(`[Kindle Sync] Stats: ${highlightsImported} imported, ${sourcesCreated} sources created, ${duplicatesSkipped} duplicates skipped`)

    return {
      success: true,
      highlightsImported,
      sourcesCreated,
      duplicatesSkipped,
      booksProcessed: booksProcessed.length,
      durationSeconds,
    }
  } catch (error) {
    console.error('[Kindle Sync] Sync error:', error)

    const durationSeconds = Math.round((Date.now() - startTime) / 1000)

    await updateSyncStatus('failed', error instanceof Error ? error.message : 'Unknown error')

    if (logId) {
      await updateSyncLog(logId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        durationSeconds,
      })
    }

    return {
      success: false,
      highlightsImported: 0,
      sourcesCreated: 0,
      duplicatesSkipped: 0,
      booksProcessed: 0,
      error: error instanceof Error ? error.message : 'Sync failed',
      errorType: 'unknown',
    }
  }
}

/**
 * Get last sync status
 *
 * @returns Last sync information
 */
export async function getLastSyncStatusAction() {
  try {
    const lastLog = await getLastSyncLog()
    const credentials = await getCredentials()

    return {
      success: true,
      hasCredentials: !!credentials,
      lastSync: lastLog
        ? {
            status: lastLog.status,
            startedAt: lastLog.startedAt.toISOString(),
            completedAt: lastLog.completedAt?.toISOString(),
            highlightsImported: lastLog.highlightsImported,
            sourcesCreated: lastLog.sourcesCreated,
            duplicatesSkipped: lastLog.duplicatesSkipped,
            booksProcessed: lastLog.booksProcessed,
            errorMessage: lastLog.errorMessage,
            durationSeconds: lastLog.durationSeconds,
          }
        : null,
      credentialsLastSync: credentials?.lastSyncAt?.toISOString(),
      credentialsLastSyncStatus: credentials?.lastSyncStatus,
    }
  } catch (error) {
    console.error('Error getting last sync status:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get sync status',
    }
  }
}

/**
 * Get sync history
 *
 * @param limit - Number of logs to return
 * @param offset - Offset for pagination
 * @returns Array of sync logs
 */
export async function getSyncHistoryAction(limit = 10, offset = 0) {
  try {
    const logs = await getSyncLogs(limit, offset)

    return {
      success: true,
      logs: logs.map(log => ({
        id: log.id,
        status: log.status,
        highlightsImported: log.highlightsImported,
        sourcesCreated: log.sourcesCreated,
        duplicatesSkipped: log.duplicatesSkipped,
        booksProcessed: log.booksProcessed,
        errorMessage: log.errorMessage,
        durationSeconds: log.durationSeconds,
        startedAt: log.startedAt.toISOString(),
        completedAt: log.completedAt?.toISOString(),
      })),
    }
  } catch (error) {
    console.error('Error getting sync history:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get sync history',
      logs: [],
    }
  }
}
