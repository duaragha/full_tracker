/**
 * @api {get} /api/v1/sources/:id Get Source
 * @apiVersion 1.0.0
 * @apiName GetSource
 * @apiGroup Sources
 * @apiDescription Retrieve a single source by ID with all its highlights.
 *
 * @apiHeader {String} Authorization Bearer token (API key)
 *
 * @apiParam {Number} id Source ID
 * @apiQuery {Boolean} [includeHighlights=false] Include all highlights for this source
 * @apiQuery {Number} [highlightsLimit=50] Limit number of highlights returned
 *
 * @apiSuccess {Boolean} success Always true
 * @apiSuccess {Object} data Source object with optional highlights array
 *
 * @apiError (401) Unauthorized Invalid or missing API key
 * @apiError (404) NotFound Source not found
 * @apiError (429) RateLimitExceeded Rate limit exceeded
 *
 * @apiExample {curl} Example usage:
 *     curl -X GET "https://api.example.com/api/v1/sources/5?includeHighlights=true" \
 *       -H "Authorization: Bearer YOUR_API_KEY"
 *
 * @apiSuccessExample {json} Success Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "data": {
 *         "id": 5,
 *         "sourceType": "book",
 *         "title": "Steve Jobs Biography",
 *         "author": "Walter Isaacson",
 *         "highlightCount": 24,
 *         "highlights": [
 *           {
 *             "id": 101,
 *             "text": "Stay hungry, stay foolish.",
 *             "note": "Famous quote",
 *             "highlightedAt": "2025-11-13T10:30:00Z"
 *           }
 *         ]
 *       }
 *     }
 */

/**
 * @api {patch} /api/v1/sources/:id Update Source
 * @apiVersion 1.0.0
 * @apiName UpdateSource
 * @apiGroup Sources
 * @apiDescription Update a source's metadata.
 *
 * @apiHeader {String} Authorization Bearer token (API key)
 *
 * @apiParam {Number} id Source ID
 *
 * @apiBody {String} [title] Updated title
 * @apiBody {String} [author] Updated author
 * @apiBody {Number} [readingProgress] Updated reading progress (0-100)
 * @apiBody {String} [category] Updated category
 *
 * @apiSuccess {Boolean} success Always true
 * @apiSuccess {Object} data Empty object
 *
 * @apiError (400) ValidationError Invalid request data
 * @apiError (401) Unauthorized Invalid or missing API key
 * @apiError (404) NotFound Source not found
 * @apiError (429) RateLimitExceeded Rate limit exceeded
 *
 * @apiExample {curl} Example usage:
 *     curl -X PATCH "https://api.example.com/api/v1/sources/5" \
 *       -H "Authorization: Bearer YOUR_API_KEY" \
 *       -H "Content-Type: application/json" \
 *       -d '{
 *         "readingProgress": 75.5,
 *         "category": "Biography"
 *       }'
 */

/**
 * @api {delete} /api/v1/sources/:id Delete Source
 * @apiVersion 1.0.0
 * @apiName DeleteSource
 * @apiGroup Sources
 * @apiDescription Permanently delete a source and all its highlights.
 *
 * @apiHeader {String} Authorization Bearer token (API key)
 *
 * @apiParam {Number} id Source ID
 *
 * @apiSuccess (204) NoContent Source deleted successfully
 *
 * @apiError (401) Unauthorized Invalid or missing API key
 * @apiError (404) NotFound Source not found
 * @apiError (429) RateLimitExceeded Rate limit exceeded
 *
 * @apiExample {curl} Example usage:
 *     curl -X DELETE "https://api.example.com/api/v1/sources/5" \
 *       -H "Authorization: Bearer YOUR_API_KEY"
 */

import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/auth'
import {
  successResponse,
  notFoundError,
  noContentResponse,
  validationError,
  handleApiError,
  parseBoolean,
  parseNumber,
} from '@/lib/api/response'
import {
  getSourceById,
  updateSource,
  deleteSource,
} from '@/lib/db/highlight-sources-store'
import { getHighlights } from '@/lib/db/highlights-store'

/**
 * GET /api/v1/sources/[id]
 * Get a single source by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (auth) => {
    try {
      const id = parseInt(params.id)

      if (isNaN(id)) {
        return validationError('Invalid source ID')
      }

      const source = await getSourceById(id)

      if (!source) {
        return notFoundError('Source')
      }

      // Check if we should include highlights
      const searchParams = request.nextUrl.searchParams
      const includeHighlights = parseBoolean(searchParams.get('includeHighlights'), false)

      if (includeHighlights) {
        const highlightsLimit = parseNumber(searchParams.get('highlightsLimit'), 50)

        // Fetch highlights for this source
        const highlights = await getHighlights({
          sourceId: id,
          limit: highlightsLimit,
        })

        return successResponse({
          ...source,
          highlights,
        })
      }

      return successResponse(source)
    } catch (error) {
      return handleApiError(error)
    }
  }, ['read'])
}

/**
 * PATCH /api/v1/sources/[id]
 * Update a source
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (auth) => {
    try {
      const id = parseInt(params.id)

      if (isNaN(id)) {
        return validationError('Invalid source ID')
      }

      // Check if source exists
      const existing = await getSourceById(id)
      if (!existing) {
        return notFoundError('Source')
      }

      const body = await request.json()

      // Validate at least one field is provided
      if (
        body.title === undefined &&
        body.author === undefined &&
        body.readingProgress === undefined &&
        body.category === undefined
      ) {
        return validationError('At least one field must be provided for update')
      }

      // Validate title if provided
      if (body.title !== undefined) {
        if (typeof body.title !== 'string' || body.title.trim().length === 0) {
          return validationError('title must be a non-empty string', 'title')
        }
      }

      // Validate readingProgress if provided
      if (body.readingProgress !== undefined) {
        if (
          typeof body.readingProgress !== 'number' ||
          body.readingProgress < 0 ||
          body.readingProgress > 100
        ) {
          return validationError('readingProgress must be a number between 0 and 100', 'readingProgress')
        }
      }

      // Update source
      await updateSource(id, {
        title: body.title,
        author: body.author,
        readingProgress: body.readingProgress,
        category: body.category,
      })

      return successResponse({ message: 'Source updated successfully' })
    } catch (error) {
      return handleApiError(error)
    }
  }, ['write'])
}

/**
 * DELETE /api/v1/sources/[id]
 * Delete a source
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (auth) => {
    try {
      const id = parseInt(params.id)

      if (isNaN(id)) {
        return validationError('Invalid source ID')
      }

      // Check if source exists
      const existing = await getSourceById(id)
      if (!existing) {
        return notFoundError('Source')
      }

      // Delete source (cascades to highlights)
      await deleteSource(id)

      return noContentResponse()
    } catch (error) {
      return handleApiError(error)
    }
  }, ['write'])
}
