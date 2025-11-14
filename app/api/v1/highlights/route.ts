/**
 * @api {get} /api/v1/highlights List Highlights
 * @apiVersion 1.0.0
 * @apiName ListHighlights
 * @apiGroup Highlights
 * @apiDescription Retrieve a paginated list of highlights with optional filtering.
 *
 * @apiHeader {String} Authorization Bearer token (API key)
 *
 * @apiQuery {Number} [page=1] Page number (minimum: 1)
 * @apiQuery {Number} [limit=20] Items per page (minimum: 1, maximum: 100)
 * @apiQuery {Number} [sourceId] Filter by source ID
 * @apiQuery {String} [sourceType] Filter by source type (book, article, pdf, web, podcast, video)
 * @apiQuery {String} [search] Search in highlight text and notes (full-text search)
 * @apiQuery {String} [tags] Comma-separated tag names to filter by
 * @apiQuery {Number[]} [tagIds] Comma-separated tag IDs to filter by
 * @apiQuery {Boolean} [hasNotes] Filter highlights with/without notes
 * @apiQuery {String} [startDate] Filter highlights after this date (ISO 8601)
 * @apiQuery {String} [endDate] Filter highlights before this date (ISO 8601)
 *
 * @apiSuccess {Boolean} success Always true
 * @apiSuccess {Object[]} data Array of highlight objects
 * @apiSuccess {Number} data.id Highlight ID
 * @apiSuccess {Number} data.sourceId Source ID
 * @apiSuccess {String} data.text Highlight text content
 * @apiSuccess {String} [data.note] User's note on the highlight
 * @apiSuccess {String} [data.color] Highlight color
 * @apiSuccess {Boolean} data.isFavorite Is highlight marked as favorite
 * @apiSuccess {Boolean} data.isArchived Is highlight archived
 * @apiSuccess {String} data.highlightedAt When the highlight was created
 * @apiSuccess {String} data.createdAt Record creation timestamp
 * @apiSuccess {String} data.updatedAt Record update timestamp
 * @apiSuccess {Object} [data.source] Source information
 * @apiSuccess {Object[]} [data.tags] Associated tags
 * @apiSuccess {Object} pagination Pagination metadata
 * @apiSuccess {Number} pagination.page Current page number
 * @apiSuccess {Number} pagination.limit Items per page
 * @apiSuccess {Number} pagination.total Total number of items
 * @apiSuccess {Number} pagination.totalPages Total number of pages
 * @apiSuccess {Boolean} pagination.hasNextPage Has next page
 * @apiSuccess {Boolean} pagination.hasPrevPage Has previous page
 *
 * @apiError (401) Unauthorized Invalid or missing API key
 * @apiError (429) RateLimitExceeded Rate limit exceeded
 * @apiError (500) InternalError Internal server error
 *
 * @apiExample {curl} Example usage:
 *     curl -X GET "https://api.example.com/api/v1/highlights?page=1&limit=20&sourceType=book" \
 *       -H "Authorization: Bearer YOUR_API_KEY"
 *
 * @apiSuccessExample {json} Success Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "data": [
 *         {
 *           "id": 1,
 *           "sourceId": 5,
 *           "text": "The only way to do great work is to love what you do.",
 *           "note": "Important career advice",
 *           "color": "yellow",
 *           "isFavorite": true,
 *           "isArchived": false,
 *           "highlightedAt": "2025-11-13T10:30:00Z",
 *           "createdAt": "2025-11-13T10:30:00Z",
 *           "updatedAt": "2025-11-13T10:30:00Z",
 *           "source": {
 *             "id": 5,
 *             "title": "Steve Jobs Biography",
 *             "author": "Walter Isaacson",
 *             "sourceType": "book"
 *           },
 *           "tags": [
 *             {
 *               "id": 1,
 *               "name": "career",
 *               "color": "#FF5722"
 *             }
 *           ]
 *         }
 *       ],
 *       "pagination": {
 *         "page": 1,
 *         "limit": 20,
 *         "total": 150,
 *         "totalPages": 8,
 *         "hasNextPage": true,
 *         "hasPrevPage": false
 *       }
 *     }
 */

import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/auth'
import {
  successResponse,
  paginatedResponse,
  parsePaginationParams,
  calculatePagination,
  parseBoolean,
  parseArray,
  parseNumberArray,
  handleApiError,
} from '@/lib/api/response'
import { getHighlights, getHighlightsCount, createHighlight } from '@/lib/db/highlights-store'
import { SearchFilters } from '@/types/highlight'

/**
 * GET /api/v1/highlights
 * List all highlights with pagination and filters
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const searchParams = request.nextUrl.searchParams

      // Parse pagination
      const { page, limit, offset } = parsePaginationParams(searchParams)

      // Parse filters
      const filters: SearchFilters & {
        limit: number
        offset: number
        tags?: string[]
        tagIds?: number[]
      } = {
        limit,
        offset,
      }

      // Source filters
      const sourceId = searchParams.get('sourceId')
      if (sourceId) {
        filters.sourceId = parseInt(sourceId)
      }

      const sourceType = searchParams.get('sourceType')
      if (sourceType) {
        filters.sourceType = sourceType as any
      }

      // Search query
      const search = searchParams.get('search')
      if (search) {
        filters.query = search
      }

      // Tag filters
      const tags = searchParams.get('tags')
      if (tags) {
        filters.tags = parseArray(tags)
      }

      const tagIds = searchParams.get('tagIds')
      if (tagIds) {
        filters.tagIds = parseNumberArray(tagIds)
      }

      // Note filter
      const hasNotes = searchParams.get('hasNotes')
      if (hasNotes !== null) {
        filters.hasNotes = parseBoolean(hasNotes)
      }

      // Date filters
      const startDate = searchParams.get('startDate')
      if (startDate) {
        filters.startDate = startDate
      }

      const endDate = searchParams.get('endDate')
      if (endDate) {
        filters.endDate = endDate
      }

      // Fetch highlights and total count
      const [highlights, total] = await Promise.all([
        getHighlights(filters),
        getHighlightsCount(filters),
      ])

      // Calculate pagination
      const pagination = calculatePagination(page, limit, total)

      return paginatedResponse(highlights, pagination)
    } catch (error) {
      return handleApiError(error)
    }
  }, ['read'])
}

/**
 * @api {post} /api/v1/highlights Create Highlight
 * @apiVersion 1.0.0
 * @apiName CreateHighlight
 * @apiGroup Highlights
 * @apiDescription Create a new highlight.
 *
 * @apiHeader {String} Authorization Bearer token (API key)
 *
 * @apiBody {Number} sourceId Source ID (required)
 * @apiBody {String} text Highlight text content (required, min: 1 char)
 * @apiBody {String} [note] User's note on the highlight
 * @apiBody {String} [locationType] Location type (page, percentage, kindle_location, time)
 * @apiBody {Number} [locationValue] Location value
 * @apiBody {Number} [locationStart] Location start position
 * @apiBody {Number} [locationEnd] Location end position
 * @apiBody {String} [color=yellow] Highlight color
 * @apiBody {String} [highlightedAt] When the highlight was created (ISO 8601, defaults to now)
 *
 * @apiSuccess {Boolean} success Always true
 * @apiSuccess {Object} data Created highlight object
 *
 * @apiError (400) ValidationError Invalid request data
 * @apiError (401) Unauthorized Invalid or missing API key
 * @apiError (404) NotFound Source not found
 * @apiError (429) RateLimitExceeded Rate limit exceeded
 * @apiError (500) InternalError Internal server error
 *
 * @apiExample {curl} Example usage:
 *     curl -X POST "https://api.example.com/api/v1/highlights" \
 *       -H "Authorization: Bearer YOUR_API_KEY" \
 *       -H "Content-Type: application/json" \
 *       -d '{
 *         "sourceId": 5,
 *         "text": "The only way to do great work is to love what you do.",
 *         "note": "Important career advice",
 *         "color": "yellow"
 *       }'
 *
 * @apiSuccessExample {json} Success Response:
 *     HTTP/1.1 201 Created
 *     {
 *       "success": true,
 *       "data": {
 *         "id": 101,
 *         "sourceId": 5,
 *         "text": "The only way to do great work is to love what you do.",
 *         "note": "Important career advice",
 *         "color": "yellow",
 *         "isFavorite": false,
 *         "isArchived": false,
 *         "highlightedAt": "2025-11-13T10:30:00Z",
 *         "createdAt": "2025-11-13T10:30:00Z",
 *         "updatedAt": "2025-11-13T10:30:00Z"
 *       }
 *     }
 */

/**
 * POST /api/v1/highlights
 * Create a new highlight
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const body = await request.json()

      // Validate required fields
      if (!body.sourceId || typeof body.sourceId !== 'number') {
        return successResponse(
          { error: 'sourceId is required and must be a number' },
          400
        )
      }

      if (!body.text || typeof body.text !== 'string' || body.text.trim().length === 0) {
        return successResponse(
          { error: 'text is required and must be a non-empty string' },
          400
        )
      }

      // Create highlight
      const highlight = await createHighlight({
        sourceId: body.sourceId,
        text: body.text.trim(),
        note: body.note || undefined,
        locationType: body.locationType || undefined,
        locationValue: body.locationValue || undefined,
        locationStart: body.locationStart || undefined,
        locationEnd: body.locationEnd || undefined,
        color: body.color || 'yellow',
        highlightedAt: body.highlightedAt || undefined,
      })

      return successResponse(highlight, 201)
    } catch (error) {
      return handleApiError(error)
    }
  }, ['write'])
}
