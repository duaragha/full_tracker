import { NextRequest, NextResponse } from 'next/server'
import { parseArticle, isArticleError } from '@/lib/parsers/article-parser'
import { createSource } from '@/lib/db/highlight-sources-store'
import {
  getRSSFeedItemById,
  markRSSFeedItemAsImported,
} from '@/lib/db/rss-feeds-store'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
})

/**
 * POST /api/rss/import-item
 * Import an RSS feed item as a source
 *
 * Body:
 * - itemId: number (required)
 *
 * Returns:
 * - Created source data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { itemId } = body

    // Validate input
    if (!itemId || typeof itemId !== 'number') {
      return NextResponse.json(
        { error: 'Item ID is required and must be a number' },
        { status: 400 }
      )
    }

    // Get the RSS feed item
    const feedItem = await getRSSFeedItemById(itemId)
    if (!feedItem) {
      return NextResponse.json(
        { error: 'RSS feed item not found' },
        { status: 404 }
      )
    }

    // Check if already imported
    if (feedItem.isImported && feedItem.sourceId) {
      return NextResponse.json(
        {
          error: 'Item already imported',
          sourceId: feedItem.sourceId,
        },
        { status: 400 }
      )
    }

    // Parse the article from the URL
    const parseResult = await parseArticle(feedItem.url)

    if (isArticleError(parseResult)) {
      return NextResponse.json(
        {
          error: 'Failed to parse article',
          details: `${parseResult.error}: ${parseResult.details || ''}`,
          parseError: parseResult,
        },
        { status: 400 }
      )
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

    // Update source with reader-specific fields using raw query
    // (These fields exist in DB but not yet in TypeScript interface)
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

    return NextResponse.json({
      success: true,
      source: {
        id: source.id,
        title: source.title,
        author: source.author,
        url: source.url,
        domain: source.domain,
        wordCount: parseResult.wordCount,
        readingTime: parseResult.readingTime,
      },
      feedItem: {
        id: feedItem.id,
        title: feedItem.title,
        feedTitle: feedItem.feedTitle,
      },
    })

  } catch (error) {
    console.error('Error importing RSS feed item:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/rss/import-item/batch
 * Import multiple RSS feed items at once
 *
 * Body:
 * - itemIds: number[] (required)
 *
 * Returns:
 * - Results for each item
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { itemIds } = body

    // Validate input
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: 'itemIds array is required and must not be empty' },
        { status: 400 }
      )
    }

    if (itemIds.some(id => typeof id !== 'number')) {
      return NextResponse.json(
        { error: 'All item IDs must be numbers' },
        { status: 400 }
      )
    }

    const results = []

    for (const itemId of itemIds) {
      try {
        // Get the RSS feed item
        const feedItem = await getRSSFeedItemById(itemId)
        if (!feedItem) {
          results.push({
            itemId,
            success: false,
            error: 'Item not found',
          })
          continue
        }

        // Skip if already imported
        if (feedItem.isImported && feedItem.sourceId) {
          results.push({
            itemId,
            success: true,
            sourceId: feedItem.sourceId,
            skipped: true,
            reason: 'Already imported',
          })
          continue
        }

        // Parse the article
        const parseResult = await parseArticle(feedItem.url)

        if (isArticleError(parseResult)) {
          results.push({
            itemId,
            success: false,
            error: 'Parse failed',
            details: parseResult.error,
          })
          continue
        }

        // Create source
        const source = await createSource({
          sourceType: 'article',
          title: parseResult.title || feedItem.title,
          author: parseResult.author || feedItem.author || undefined,
          url: parseResult.url,
          domain: parseResult.domain,
          content: parseResult.content,
          excerpt: parseResult.excerpt || feedItem.description || undefined,
        })

        // Update source with reader fields
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

        // Mark as imported
        await markRSSFeedItemAsImported(itemId, source.id)

        results.push({
          itemId,
          success: true,
          sourceId: source.id,
          title: source.title,
        })

      } catch (error) {
        results.push({
          itemId,
          success: false,
          error: 'Import failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failedCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      total: itemIds.length,
      successCount,
      failedCount,
      results,
    })

  } catch (error) {
    console.error('Error batch importing RSS feed items:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
