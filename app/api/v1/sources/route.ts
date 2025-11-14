/**
 * @api {get} /api/v1/sources List Sources
 * @apiVersion 1.0.0
 * @apiName ListSources
 * @apiGroup Sources
 * @apiDescription Retrieve a paginated list of sources (books, articles, PDFs, etc.) with optional filtering.
 *
 * @apiHeader {String} Authorization Bearer token (API key)
 *
 * @apiQuery {Number} [page=1] Page number (minimum: 1)
 * @apiQuery {Number} [limit=20] Items per page (minimum: 1, maximum: 100)
 * @apiQuery {String} [type] Filter by source type (book, article, pdf, web, podcast, video)
 * @apiQuery {String} [search] Search in title and author
 * @apiQuery {Number} [bookId] Filter by book ID
 *
 * @apiSuccess {Boolean} success Always true
 * @apiSuccess {Object[]} data Array of source objects
 * @apiSuccess {Number} data.id Source ID
 * @apiSuccess {String} data.sourceType Source type
 * @apiSuccess {String} data.title Source title
 * @apiSuccess {String} [data.author] Author name
 * @apiSuccess {String} [data.url] Source URL
 * @apiSuccess {String} [data.isbn] ISBN for books
 * @apiSuccess {String} [data.publishedDate] Publication date
 * @apiSuccess {String} [data.category] Category/genre
 * @apiSuccess {Number} [data.readingProgress] Reading progress percentage (0-100)
 * @apiSuccess {String} data.createdAt Record creation timestamp
 * @apiSuccess {String} data.updatedAt Record update timestamp
 * @apiSuccess {String} [data.lastHighlightedAt] Last highlight timestamp
 * @apiSuccess {Number} [data.highlightCount] Number of highlights
 * @apiSuccess {Object} pagination Pagination metadata
 *
 * @apiError (401) Unauthorized Invalid or missing API key
 * @apiError (429) RateLimitExceeded Rate limit exceeded
 * @apiError (500) InternalError Internal server error
 *
 * @apiExample {curl} Example usage:
 *     curl -X GET "https://api.example.com/api/v1/sources?page=1&limit=20&type=book" \
 *       -H "Authorization: Bearer YOUR_API_KEY"
 *
 * @apiSuccessExample {json} Success Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "data": [
 *         {
 *           "id": 5,
 *           "sourceType": "book",
 *           "title": "Steve Jobs Biography",
 *           "author": "Walter Isaacson",
 *           "isbn": "9781451648539",
 *           "publishedDate": "2011-10-24",
 *           "category": "Biography",
 *           "readingProgress": 65.5,
 *           "highlightCount": 24,
 *           "createdAt": "2025-11-01T10:00:00Z",
 *           "updatedAt": "2025-11-13T10:30:00Z",
 *           "lastHighlightedAt": "2025-11-13T10:30:00Z"
 *         }
 *       ],
 *       "pagination": {
 *         "page": 1,
 *         "limit": 20,
 *         "total": 45,
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
  parsePaginationParams,
  calculatePagination,
  validationError,
  handleApiError,
} from '@/lib/api/response'
import { getSources, createSource } from '@/lib/db/highlight-sources-store'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

/**
 * GET /api/v1/sources
 * List all sources with pagination and filters
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const searchParams = request.nextUrl.searchParams

      // Parse pagination
      const { page, limit, offset } = parsePaginationParams(searchParams)

      // Parse filters
      const filters: any = {
        limit,
        offset,
      }

      // Type filter
      const type = searchParams.get('type')
      if (type) {
        filters.sourceType = type
      }

      // Search query
      const search = searchParams.get('search')
      if (search) {
        filters.search = search
      }

      // Book ID filter
      const bookId = searchParams.get('bookId')
      if (bookId) {
        filters.bookId = parseInt(bookId)
      }

      // Fetch sources
      const sources = await getSources(filters)

      // Get total count (for pagination)
      let countQuery = 'SELECT COUNT(*) as count FROM sources WHERE 1=1'
      const countParams: any[] = []
      let paramIndex = 1

      if (type) {
        countQuery += ` AND source_type = $${paramIndex}`
        countParams.push(type)
        paramIndex++
      }

      if (search) {
        countQuery += ` AND (title ILIKE $${paramIndex} OR author ILIKE $${paramIndex})`
        countParams.push(`%${search}%`)
        paramIndex++
      }

      const countResult = await pool.query(countQuery, countParams)
      const total = parseInt(countResult.rows[0].count)

      // Calculate pagination
      const pagination = calculatePagination(page, limit, total)

      return paginatedResponse(sources, pagination)
    } catch (error) {
      return handleApiError(error)
    }
  }, ['read'])
}

/**
 * @api {post} /api/v1/sources Create Source
 * @apiVersion 1.0.0
 * @apiName CreateSource
 * @apiGroup Sources
 * @apiDescription Create a new source (book, article, PDF, etc.). This is useful for importing articles or adding books before creating highlights.
 *
 * @apiHeader {String} Authorization Bearer token (API key)
 *
 * @apiBody {String} sourceType Source type (book, article, pdf, web, podcast, video) - required
 * @apiBody {String} title Source title - required
 * @apiBody {String} [author] Author name
 * @apiBody {String} [url] Source URL (required for web articles)
 * @apiBody {String} [isbn] ISBN for books
 * @apiBody {String} [publishedDate] Publication date (ISO 8601)
 * @apiBody {String} [domain] Domain for web articles
 * @apiBody {String} [content] Full article content for read-later
 * @apiBody {String} [excerpt] Article excerpt/summary
 * @apiBody {String} [category] Category or genre
 *
 * @apiSuccess {Boolean} success Always true
 * @apiSuccess {Object} data Created source object
 *
 * @apiError (400) ValidationError Invalid request data
 * @apiError (401) Unauthorized Invalid or missing API key
 * @apiError (429) RateLimitExceeded Rate limit exceeded
 * @apiError (500) InternalError Internal server error
 *
 * @apiExample {curl} Example usage:
 *     curl -X POST "https://api.example.com/api/v1/sources" \
 *       -H "Authorization: Bearer YOUR_API_KEY" \
 *       -H "Content-Type: application/json" \
 *       -d '{
 *         "sourceType": "article",
 *         "title": "How to Build a REST API",
 *         "author": "John Doe",
 *         "url": "https://example.com/rest-api-guide",
 *         "domain": "example.com",
 *         "category": "Programming"
 *       }'
 *
 * @apiSuccessExample {json} Success Response:
 *     HTTP/1.1 201 Created
 *     {
 *       "success": true,
 *       "data": {
 *         "id": 42,
 *         "sourceType": "article",
 *         "title": "How to Build a REST API",
 *         "author": "John Doe",
 *         "url": "https://example.com/rest-api-guide",
 *         "domain": "example.com",
 *         "category": "Programming",
 *         "readingProgress": 0,
 *         "createdAt": "2025-11-13T10:30:00Z",
 *         "updatedAt": "2025-11-13T10:30:00Z"
 *       }
 *     }
 */

/**
 * POST /api/v1/sources
 * Create a new source
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const body = await request.json()

      // Validate required fields
      if (!body.sourceType || typeof body.sourceType !== 'string') {
        return validationError('sourceType is required and must be a string', 'sourceType')
      }

      const validTypes = ['book', 'article', 'pdf', 'web', 'podcast', 'video']
      if (!validTypes.includes(body.sourceType)) {
        return validationError(
          `sourceType must be one of: ${validTypes.join(', ')}`,
          'sourceType'
        )
      }

      if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
        return validationError('title is required and must be a non-empty string', 'title')
      }

      // Create source
      const source = await createSource({
        sourceType: body.sourceType,
        title: body.title.trim(),
        author: body.author || undefined,
        url: body.url || undefined,
        isbn: body.isbn || undefined,
        publishedDate: body.publishedDate || undefined,
        domain: body.domain || undefined,
        content: body.content || undefined,
        excerpt: body.excerpt || undefined,
        category: body.category || undefined,
      })

      return successResponse(source, 201)
    } catch (error) {
      return handleApiError(error)
    }
  }, ['write'])
}
