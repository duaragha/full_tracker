import { NextRequest, NextResponse } from 'next/server'
import {
  getRSSFeeds,
  getRSSFeedById,
  updateRSSFeed,
  deleteRSSFeed,
} from '@/lib/db/rss-feeds-store'

/**
 * GET /api/rss/feeds
 * Get all RSS feeds
 *
 * Query params:
 * - isActive: boolean (optional)
 * - limit: number (optional)
 * - offset: number (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const filters: any = {}

    const isActiveParam = searchParams.get('isActive')
    if (isActiveParam !== null) {
      filters.isActive = isActiveParam === 'true'
    }

    const limitParam = searchParams.get('limit')
    if (limitParam) {
      const limit = parseInt(limitParam)
      if (!isNaN(limit)) filters.limit = limit
    }

    const offsetParam = searchParams.get('offset')
    if (offsetParam) {
      const offset = parseInt(offsetParam)
      if (!isNaN(offset)) filters.offset = offset
    }

    const feeds = await getRSSFeeds(filters)

    return NextResponse.json({
      success: true,
      feeds,
      count: feeds.length,
    })

  } catch (error) {
    console.error('Error getting RSS feeds:', error)
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
 * PATCH /api/rss/feeds
 * Update an RSS feed
 *
 * Body:
 * - id: number (required)
 * - updates: object (title, siteUrl, description, fetchIntervalMinutes, isActive)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, updates } = body

    if (!id || typeof id !== 'number') {
      return NextResponse.json(
        { error: 'Feed ID is required and must be a number' },
        { status: 400 }
      )
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'Updates object is required' },
        { status: 400 }
      )
    }

    // Verify feed exists
    const existingFeed = await getRSSFeedById(id)
    if (!existingFeed) {
      return NextResponse.json(
        { error: 'Feed not found' },
        { status: 404 }
      )
    }

    // Update the feed
    await updateRSSFeed(id, updates)

    // Get updated feed
    const updatedFeed = await getRSSFeedById(id)

    return NextResponse.json({
      success: true,
      feed: updatedFeed,
    })

  } catch (error) {
    console.error('Error updating RSS feed:', error)
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
 * DELETE /api/rss/feeds
 * Delete an RSS feed
 *
 * Body:
 * - id: number (required)
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id || typeof id !== 'number') {
      return NextResponse.json(
        { error: 'Feed ID is required and must be a number' },
        { status: 400 }
      )
    }

    // Verify feed exists
    const existingFeed = await getRSSFeedById(id)
    if (!existingFeed) {
      return NextResponse.json(
        { error: 'Feed not found' },
        { status: 404 }
      )
    }

    // Delete the feed (cascades to items)
    await deleteRSSFeed(id)

    return NextResponse.json({
      success: true,
      message: 'Feed deleted successfully',
    })

  } catch (error) {
    console.error('Error deleting RSS feed:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
