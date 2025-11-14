import { NextRequest, NextResponse } from 'next/server'
import {
  getRSSFeedItems,
  getRSSFeedItemById,
  deleteRSSFeedItem,
} from '@/lib/db/rss-feeds-store'

/**
 * GET /api/rss/items
 * Get RSS feed items
 *
 * Query params:
 * - feedId: number (optional)
 * - isImported: boolean (optional)
 * - limit: number (optional)
 * - offset: number (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const filters: any = {}

    const feedIdParam = searchParams.get('feedId')
    if (feedIdParam) {
      const feedId = parseInt(feedIdParam)
      if (!isNaN(feedId)) filters.feedId = feedId
    }

    const isImportedParam = searchParams.get('isImported')
    if (isImportedParam !== null) {
      filters.isImported = isImportedParam === 'true'
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

    const items = await getRSSFeedItems(filters)

    return NextResponse.json({
      success: true,
      items,
      count: items.length,
    })

  } catch (error) {
    console.error('Error getting RSS feed items:', error)
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
 * DELETE /api/rss/items
 * Delete an RSS feed item
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
        { error: 'Item ID is required and must be a number' },
        { status: 400 }
      )
    }

    // Verify item exists
    const existingItem = await getRSSFeedItemById(id)
    if (!existingItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    // Delete the item
    await deleteRSSFeedItem(id)

    return NextResponse.json({
      success: true,
      message: 'Item deleted successfully',
    })

  } catch (error) {
    console.error('Error deleting RSS feed item:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
