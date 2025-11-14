'use server'

import { revalidatePath } from 'next/cache'
import { parseRSSFeed, isRSSError } from '@/lib/parsers/rss-parser'
import { parseArticle, isArticleError } from '@/lib/parsers/article-parser'
import { createSource } from '@/lib/db/highlight-sources-store'
import {
  getRSSFeeds,
  getRSSFeedById,
  getRSSFeedByUrl,
  createRSSFeed,
  updateRSSFeed,
  deleteRSSFeed,
  markRSSFeedAsFetched,
  getRSSFeedItems,
  getRSSFeedItemById,
  createRSSFeedItems,
  markRSSFeedItemAsImported,
  deleteRSSFeedItem,
  getFeedsToFetch,
} from '@/lib/db/rss-feeds-store'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
})

// ============================================
// RSS FEED ACTIONS
// ============================================

/**
 * Subscribe to an RSS feed by URL
 * Fetches, parses, and saves the feed
 */
export async function subscribeToRSSFeedAction(feedUrl: string) {
  try {
    if (!feedUrl || typeof feedUrl !== 'string') {
      return { success: false, error: 'Invalid feed URL provided' }
    }

    // Check if feed already exists
    const existingFeed = await getRSSFeedByUrl(feedUrl)
    if (existingFeed) {
      return {
        success: false,
        error: 'Feed already subscribed',
        feedId: existingFeed.id,
      }
    }

    // Parse the RSS feed
    const parseResult = await parseRSSFeed(feedUrl)

    if (isRSSError(parseResult)) {
      return {
        success: false,
        error: parseResult.error,
        details: parseResult.details,
      }
    }

    // Create new feed
    const feed = await createRSSFeed({
      title: parseResult.title,
      feedUrl: parseResult.feedUrl,
      siteUrl: parseResult.siteUrl,
      description: parseResult.description,
    })

    await markRSSFeedAsFetched(feed.id, true)

    // Save feed items
    const itemsToCreate = parseResult.items.map(item => ({
      feedId: feed.id,
      title: item.title,
      url: item.url,
      description: item.description,
      author: item.author,
      publishedAt: item.publishedAt,
    }))

    const insertedCount = await createRSSFeedItems(itemsToCreate)

    revalidatePath('/rss')
    revalidatePath('/highlights')

    return {
      success: true,
      feedId: feed.id,
      feed: {
        id: feed.id,
        title: feed.title,
        feedUrl: feed.feedUrl,
        itemsFound: parseResult.items.length,
        itemsNew: insertedCount,
      },
    }
  } catch (error) {
    console.error('Error subscribing to RSS feed:', error)
    return {
      success: false,
      error: 'Failed to subscribe to feed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Fetch updates for an existing RSS feed
 */
export async function refreshRSSFeedAction(feedId: number) {
  try {
    if (!feedId || typeof feedId !== 'number') {
      return { success: false, error: 'Invalid feed ID' }
    }

    const existingFeed = await getRSSFeedById(feedId)
    if (!existingFeed) {
      return { success: false, error: 'Feed not found' }
    }

    // Parse the RSS feed
    const parseResult = await parseRSSFeed(existingFeed.feedUrl)

    if (isRSSError(parseResult)) {
      await updateRSSFeed(existingFeed.id, {
        lastError: `${parseResult.error}: ${parseResult.details || ''}`,
      })
      await markRSSFeedAsFetched(existingFeed.id, false)

      return {
        success: false,
        error: parseResult.error,
        details: parseResult.details,
      }
    }

    // Update feed metadata
    await updateRSSFeed(existingFeed.id, {
      title: parseResult.title,
      siteUrl: parseResult.siteUrl,
      description: parseResult.description,
    })
    await markRSSFeedAsFetched(existingFeed.id, true)

    // Save feed items
    const itemsToCreate = parseResult.items.map(item => ({
      feedId: existingFeed.id,
      title: item.title,
      url: item.url,
      description: item.description,
      author: item.author,
      publishedAt: item.publishedAt,
    }))

    const insertedCount = await createRSSFeedItems(itemsToCreate)

    revalidatePath('/rss')

    return {
      success: true,
      itemsFound: parseResult.items.length,
      itemsNew: insertedCount,
    }
  } catch (error) {
    console.error('Error refreshing RSS feed:', error)
    return {
      success: false,
      error: 'Failed to refresh feed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get all RSS feeds
 */
export async function getRSSFeedsAction(filters?: {
  isActive?: boolean
  limit?: number
  offset?: number
}) {
  try {
    const feeds = await getRSSFeeds(filters)
    return {
      success: true,
      feeds,
    }
  } catch (error) {
    console.error('Error getting RSS feeds:', error)
    return {
      success: false,
      error: 'Failed to get feeds',
      details: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get a single RSS feed by ID
 */
export async function getRSSFeedByIdAction(feedId: number) {
  try {
    const feed = await getRSSFeedById(feedId)
    if (!feed) {
      return { success: false, error: 'Feed not found' }
    }

    return {
      success: true,
      feed,
    }
  } catch (error) {
    console.error('Error getting RSS feed:', error)
    return {
      success: false,
      error: 'Failed to get feed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Update an RSS feed
 */
export async function updateRSSFeedAction(
  feedId: number,
  updates: {
    title?: string
    siteUrl?: string
    description?: string
    fetchIntervalMinutes?: number
    isActive?: boolean
  }
) {
  try {
    if (!feedId || typeof feedId !== 'number') {
      return { success: false, error: 'Invalid feed ID' }
    }

    const existingFeed = await getRSSFeedById(feedId)
    if (!existingFeed) {
      return { success: false, error: 'Feed not found' }
    }

    await updateRSSFeed(feedId, updates)

    revalidatePath('/rss')

    return { success: true }
  } catch (error) {
    console.error('Error updating RSS feed:', error)
    return {
      success: false,
      error: 'Failed to update feed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Delete an RSS feed
 */
export async function deleteRSSFeedAction(feedId: number) {
  try {
    if (!feedId || typeof feedId !== 'number') {
      return { success: false, error: 'Invalid feed ID' }
    }

    const existingFeed = await getRSSFeedById(feedId)
    if (!existingFeed) {
      return { success: false, error: 'Feed not found' }
    }

    await deleteRSSFeed(feedId)

    revalidatePath('/rss')

    return { success: true }
  } catch (error) {
    console.error('Error deleting RSS feed:', error)
    return {
      success: false,
      error: 'Failed to delete feed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================
// RSS FEED ITEM ACTIONS
// ============================================

/**
 * Get RSS feed items
 */
export async function getRSSFeedItemsAction(filters?: {
  feedId?: number
  isImported?: boolean
  limit?: number
  offset?: number
}) {
  try {
    const items = await getRSSFeedItems(filters)
    return {
      success: true,
      items,
    }
  } catch (error) {
    console.error('Error getting RSS feed items:', error)
    return {
      success: false,
      error: 'Failed to get items',
      details: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Import an RSS feed item as a source
 */
export async function importRSSFeedItemAction(itemId: number) {
  try {
    if (!itemId || typeof itemId !== 'number') {
      return { success: false, error: 'Invalid item ID' }
    }

    // Get the RSS feed item
    const feedItem = await getRSSFeedItemById(itemId)
    if (!feedItem) {
      return { success: false, error: 'RSS feed item not found' }
    }

    // Check if already imported
    if (feedItem.isImported && feedItem.sourceId) {
      return {
        success: false,
        error: 'Item already imported',
        sourceId: feedItem.sourceId,
      }
    }

    // Parse the article from the URL
    const parseResult = await parseArticle(feedItem.url)

    if (isArticleError(parseResult)) {
      return {
        success: false,
        error: 'Failed to parse article',
        details: `${parseResult.error}: ${parseResult.details || ''}`,
      }
    }

    // Create source from parsed article
    const source = await createSource({
      sourceType: 'article',
      title: parseResult.title || feedItem.title,
      author: parseResult.author || feedItem.author || undefined,
      url: parseResult.url,
      domain: parseResult.domain,
      content: parseResult.content,
      excerpt: parseResult.excerpt || feedItem.description || undefined,
    })

    // Update source with reader-specific fields
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
        parseResult.htmlContent,
        parseResult.wordCount,
        parseResult.readingTime,
        source.id,
      ]
    )

    // Mark RSS feed item as imported
    await markRSSFeedItemAsImported(itemId, source.id)

    revalidatePath('/rss')
    revalidatePath('/highlights')
    revalidatePath('/reader')

    return {
      success: true,
      sourceId: source.id,
      source: {
        id: source.id,
        title: source.title,
        author: source.author,
        url: source.url,
      },
    }
  } catch (error) {
    console.error('Error importing RSS feed item:', error)
    return {
      success: false,
      error: 'Failed to import item',
      details: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Import multiple RSS feed items
 */
export async function importRSSFeedItemsBatchAction(itemIds: number[]) {
  try {
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return { success: false, error: 'Invalid item IDs array' }
    }

    const results = []

    for (const itemId of itemIds) {
      const result = await importRSSFeedItemAction(itemId)
      results.push({
        itemId,
        ...result,
      })
    }

    const successCount = results.filter(r => r.success).length
    const failedCount = results.filter(r => !r.success).length

    revalidatePath('/rss')
    revalidatePath('/highlights')
    revalidatePath('/reader')

    return {
      success: true,
      total: itemIds.length,
      successCount,
      failedCount,
      results,
    }
  } catch (error) {
    console.error('Error batch importing RSS feed items:', error)
    return {
      success: false,
      error: 'Failed to batch import items',
      details: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Delete an RSS feed item
 */
export async function deleteRSSFeedItemAction(itemId: number) {
  try {
    if (!itemId || typeof itemId !== 'number') {
      return { success: false, error: 'Invalid item ID' }
    }

    const existingItem = await getRSSFeedItemById(itemId)
    if (!existingItem) {
      return { success: false, error: 'Item not found' }
    }

    await deleteRSSFeedItem(itemId)

    revalidatePath('/rss')

    return { success: true }
  } catch (error) {
    console.error('Error deleting RSS feed item:', error)
    return {
      success: false,
      error: 'Failed to delete item',
      details: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================
// BACKGROUND TASKS
// ============================================

/**
 * Fetch updates for all active feeds that are due
 */
export async function refreshAllDueRSSFeedsAction() {
  try {
    const feedsToFetch = await getFeedsToFetch(10)

    const results = []

    for (const feed of feedsToFetch) {
      const result = await refreshRSSFeedAction(feed.id)
      results.push({
        feedId: feed.id,
        feedTitle: feed.title,
        ...result,
      })
    }

    revalidatePath('/rss')

    return {
      success: true,
      feedsProcessed: feedsToFetch.length,
      results,
    }
  } catch (error) {
    console.error('Error refreshing all due RSS feeds:', error)
    return {
      success: false,
      error: 'Failed to refresh feeds',
      details: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
