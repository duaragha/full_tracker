import { NextRequest, NextResponse } from 'next/server'
import { parseRSSFeed, isRSSError } from '@/lib/parsers/rss-parser'
import {
  createRSSFeed,
  getRSSFeedByUrl,
  createRSSFeedItems,
  markRSSFeedAsFetched,
  updateRSSFeed,
  getRSSFeedById,
} from '@/lib/db/rss-feeds-store'

/**
 * POST /api/rss/fetch
 * Fetch and parse an RSS feed, save it to database
 *
 * Body:
 * - feedUrl: string (required)
 * - createIfNew: boolean (optional, default: true)
 *
 * Returns:
 * - Feed data with items
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { feedUrl, createIfNew = true } = body

    // Validate input
    if (!feedUrl || typeof feedUrl !== 'string') {
      return NextResponse.json(
        { error: 'Feed URL is required' },
        { status: 400 }
      )
    }

    // Check if feed already exists
    let existingFeed = await getRSSFeedByUrl(feedUrl)

    // Parse the RSS feed
    const parseResult = await parseRSSFeed(feedUrl)

    if (isRSSError(parseResult)) {
      // If parsing failed, update error tracking if feed exists
      if (existingFeed) {
        await updateRSSFeed(existingFeed.id, {
          lastError: `${parseResult.error}: ${parseResult.details || ''}`,
        })
        await markRSSFeedAsFetched(existingFeed.id, false)
      }

      return NextResponse.json(
        {
          error: parseResult.error,
          details: parseResult.details,
        },
        { status: 400 }
      )
    }

    // Create or update feed
    let feed
    if (existingFeed) {
      // Update existing feed metadata
      await updateRSSFeed(existingFeed.id, {
        title: parseResult.title,
        siteUrl: parseResult.siteUrl,
        description: parseResult.description,
      })
      await markRSSFeedAsFetched(existingFeed.id, true)
      feed = await getRSSFeedById(existingFeed.id)
    } else if (createIfNew) {
      // Create new feed
      feed = await createRSSFeed({
        title: parseResult.title,
        feedUrl: parseResult.feedUrl,
        siteUrl: parseResult.siteUrl,
        description: parseResult.description,
      })
      await markRSSFeedAsFetched(feed.id, true)
    } else {
      return NextResponse.json(
        { error: 'Feed not found and createIfNew is false' },
        { status: 404 }
      )
    }

    if (!feed) {
      return NextResponse.json(
        { error: 'Failed to create or retrieve feed' },
        { status: 500 }
      )
    }

    // Save feed items (deduplicates automatically)
    const itemsToCreate = parseResult.items.map(item => ({
      feedId: feed.id,
      title: item.title,
      url: item.url,
      description: item.description,
      author: item.author,
      publishedAt: item.publishedAt,
    }))

    const insertedCount = await createRSSFeedItems(itemsToCreate)

    return NextResponse.json({
      success: true,
      feed: {
        id: feed.id,
        title: feed.title,
        feedUrl: feed.feedUrl,
        siteUrl: feed.siteUrl,
        description: feed.description,
        itemCount: feed.itemCount || 0,
        unimportedCount: feed.unimportedCount || 0,
      },
      itemsFound: parseResult.items.length,
      itemsNew: insertedCount,
    })

  } catch (error) {
    console.error('Error fetching RSS feed:', error)
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
 * GET /api/rss/fetch?feedId=123
 * Fetch updates for an existing feed
 *
 * Query params:
 * - feedId: number (required)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const feedIdStr = searchParams.get('feedId')

    if (!feedIdStr) {
      return NextResponse.json(
        { error: 'feedId query parameter is required' },
        { status: 400 }
      )
    }

    const feedId = parseInt(feedIdStr)
    if (isNaN(feedId)) {
      return NextResponse.json(
        { error: 'feedId must be a valid number' },
        { status: 400 }
      )
    }

    // Get existing feed
    const existingFeed = await getRSSFeedById(feedId)
    if (!existingFeed) {
      return NextResponse.json(
        { error: 'Feed not found' },
        { status: 404 }
      )
    }

    // Parse the RSS feed
    const parseResult = await parseRSSFeed(existingFeed.feedUrl)

    if (isRSSError(parseResult)) {
      // Update error tracking
      await updateRSSFeed(existingFeed.id, {
        lastError: `${parseResult.error}: ${parseResult.details || ''}`,
      })
      await markRSSFeedAsFetched(existingFeed.id, false)

      return NextResponse.json(
        {
          error: parseResult.error,
          details: parseResult.details,
        },
        { status: 400 }
      )
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

    const updatedFeed = await getRSSFeedById(existingFeed.id)

    return NextResponse.json({
      success: true,
      feed: updatedFeed,
      itemsFound: parseResult.items.length,
      itemsNew: insertedCount,
    })

  } catch (error) {
    console.error('Error fetching RSS feed:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
