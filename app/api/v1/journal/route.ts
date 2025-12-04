/**
 * @api {get} /api/v1/journal List Journal Entries
 * @apiVersion 1.0.0
 * @apiName ListJournalEntries
 * @apiGroup Journal
 * @apiDescription Retrieve a paginated list of journal entries with optional filtering.
 *
 * @apiHeader {String} Authorization Bearer token (API key)
 *
 * @apiQuery {Number} [page=1] Page number (minimum: 1)
 * @apiQuery {Number} [limit=20] Items per page (minimum: 1, maximum: 100)
 * @apiQuery {String} [mood] Filter by mood (great, good, okay, bad, terrible)
 * @apiQuery {String} [dateFrom] Filter entries from this date (ISO 8601, format: YYYY-MM-DD)
 * @apiQuery {String} [dateTo] Filter entries until this date (ISO 8601, format: YYYY-MM-DD)
 * @apiQuery {String} [search] Full-text search in title and content
 * @apiQuery {String} [tags] Comma-separated tag names to filter by
 *
 * @apiSuccess {Boolean} success Always true
 * @apiSuccess {Object[]} data Array of journal entry objects
 * @apiSuccess {Number} data.id Entry ID
 * @apiSuccess {String} data.title Entry title
 * @apiSuccess {String} data.content Entry content
 * @apiSuccess {Number} data.wordCount Word count of the entry
 * @apiSuccess {String} data.entryDate Date of the entry (YYYY-MM-DD)
 * @apiSuccess {String} data.entryTime Time of the entry (HH:MM)
 * @apiSuccess {String} [data.mood] Mood at time of entry
 * @apiSuccess {String} [data.weather] Weather at time of entry
 * @apiSuccess {String} [data.location] Location at time of entry
 * @apiSuccess {String} [data.activity] Activity at time of entry
 * @apiSuccess {Object[]} data.tags Associated tags
 * @apiSuccess {Number} data.tags.id Tag ID
 * @apiSuccess {String} data.tags.name Tag name
 * @apiSuccess {String} data.createdAt Record creation timestamp
 * @apiSuccess {String} data.updatedAt Record update timestamp
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
 *     curl -X GET "https://api.example.com/api/v1/journal?page=1&limit=20&mood=great" \
 *       -H "Authorization: Bearer YOUR_API_KEY"
 *
 * @apiSuccessExample {json} Success Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "data": [
 *         {
 *           "id": 1,
 *           "title": "Morning Reflections",
 *           "content": "Today was a great day...",
 *           "wordCount": 150,
 *           "entryDate": "2025-12-04",
 *           "entryTime": "09:30",
 *           "mood": "great",
 *           "weather": "sunny",
 *           "location": "home",
 *           "activity": "meditation",
 *           "tags": [
 *             {
 *               "id": 1,
 *               "name": "gratitude"
 *             }
 *           ],
 *           "createdAt": "2025-12-04T09:30:00Z",
 *           "updatedAt": "2025-12-04T09:30:00Z"
 *         }
 *       ],
 *       "pagination": {
 *         "page": 1,
 *         "limit": 20,
 *         "total": 50,
 *         "totalPages": 3,
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
  handleApiError,
} from '@/lib/api/response'
import {
  getJournalEntries,
  createJournalEntry,
} from '@/lib/db/journal-store'
import { JournalFilters } from '@/types/journal'

/**
 * GET /api/v1/journal
 * List all journal entries with pagination and filters
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const searchParams = request.nextUrl.searchParams

      // Parse pagination
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
      const limit = Math.min(
        Math.max(1, parseInt(searchParams.get('limit') || '20', 10)),
        100
      )

      // Parse filters
      const filters: JournalFilters = {}

      // Mood filter
      const mood = searchParams.get('mood')
      if (mood) {
        filters.mood = mood as any
      }

      // Date filters
      const dateFrom = searchParams.get('dateFrom')
      if (dateFrom) {
        filters.startDate = dateFrom
      }

      const dateTo = searchParams.get('dateTo')
      if (dateTo) {
        filters.endDate = dateTo
      }

      // Search query
      const search = searchParams.get('search')
      if (search) {
        filters.searchText = search
      }

      // Tag filters
      const tags = searchParams.get('tags')
      if (tags) {
        filters.tags = tags.split(',').map((t) => t.trim())
      }

      // Fetch entries and total count
      const { entries, total } = await getJournalEntries(filters, page, limit)

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limit)
      const pagination = {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }

      return paginatedResponse(entries, pagination)
    } catch (error) {
      return handleApiError(error)
    }
  }, ['read'])
}

/**
 * @api {post} /api/v1/journal Create Journal Entry
 * @apiVersion 1.0.0
 * @apiName CreateJournalEntry
 * @apiGroup Journal
 * @apiDescription Create a new journal entry.
 *
 * @apiHeader {String} Authorization Bearer token (API key)
 *
 * @apiBody {String} title Entry title (required, min: 1 char)
 * @apiBody {String} content Entry content (required, min: 1 char)
 * @apiBody {String} entryDate Date of entry (required, format: YYYY-MM-DD)
 * @apiBody {String} entryTime Time of entry (required, format: HH:MM)
 * @apiBody {String} [mood] Mood (great, good, okay, bad, terrible)
 * @apiBody {String} [weather] Weather description
 * @apiBody {String} [location] Location name
 * @apiBody {String} [activity] Activity description
 * @apiBody {String[]} [tagNames] Array of tag names to associate
 *
 * @apiSuccess (201) {Boolean} success Always true
 * @apiSuccess (201) {Object} data Created journal entry object
 *
 * @apiError (400) ValidationError Invalid request data
 * @apiError (401) Unauthorized Invalid or missing API key
 * @apiError (429) RateLimitExceeded Rate limit exceeded
 * @apiError (500) InternalError Internal server error
 *
 * @apiExample {curl} Example usage:
 *     curl -X POST "https://api.example.com/api/v1/journal" \
 *       -H "Authorization: Bearer YOUR_API_KEY" \
 *       -H "Content-Type: application/json" \
 *       -d '{
 *         "title": "Morning Reflections",
 *         "content": "Today was a great day...",
 *         "entryDate": "2025-12-04",
 *         "entryTime": "09:30",
 *         "mood": "great",
 *         "tagNames": ["gratitude", "reflection"]
 *       }'
 *
 * @apiSuccessExample {json} Success Response:
 *     HTTP/1.1 201 Created
 *     {
 *       "success": true,
 *       "data": {
 *         "id": 1,
 *         "title": "Morning Reflections",
 *         "content": "Today was a great day...",
 *         "wordCount": 5,
 *         "entryDate": "2025-12-04",
 *         "entryTime": "09:30",
 *         "mood": "great",
 *         "weather": null,
 *         "location": null,
 *         "activity": null,
 *         "tags": [],
 *         "createdAt": "2025-12-04T09:30:00Z",
 *         "updatedAt": "2025-12-04T09:30:00Z"
 *       }
 *     }
 */

/**
 * POST /api/v1/journal
 * Create a new journal entry
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const body = await request.json()

      // Validate required fields
      if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
        return successResponse(
          { error: 'title is required and must be a non-empty string' },
          400
        )
      }

      if (!body.content || typeof body.content !== 'string' || body.content.trim().length === 0) {
        return successResponse(
          { error: 'content is required and must be a non-empty string' },
          400
        )
      }

      if (!body.entryDate || typeof body.entryDate !== 'string') {
        return successResponse(
          { error: 'entryDate is required and must be a string (format: YYYY-MM-DD)' },
          400
        )
      }

      if (!body.entryTime || typeof body.entryTime !== 'string') {
        return successResponse(
          { error: 'entryTime is required and must be a string (format: HH:MM)' },
          400
        )
      }

      // Create journal entry
      const entry = await createJournalEntry({
        title: body.title.trim(),
        content: body.content.trim(),
        entryDate: body.entryDate,
        entryTime: body.entryTime,
        mood: body.mood || undefined,
        weather: body.weather || undefined,
        location: body.location || undefined,
        activity: body.activity || undefined,
        tagNames: body.tagNames || undefined,
      })

      return successResponse(entry, 201)
    } catch (error) {
      return handleApiError(error)
    }
  }, ['write'])
}
