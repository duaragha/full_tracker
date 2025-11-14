/**
 * @api {get} /api/v1/highlights/:id Get Highlight
 * @apiVersion 1.0.0
 * @apiName GetHighlight
 * @apiGroup Highlights
 * @apiDescription Retrieve a single highlight by ID.
 *
 * @apiHeader {String} Authorization Bearer token (API key)
 *
 * @apiParam {Number} id Highlight ID
 *
 * @apiSuccess {Boolean} success Always true
 * @apiSuccess {Object} data Highlight object
 *
 * @apiError (401) Unauthorized Invalid or missing API key
 * @apiError (404) NotFound Highlight not found
 * @apiError (429) RateLimitExceeded Rate limit exceeded
 *
 * @apiExample {curl} Example usage:
 *     curl -X GET "https://api.example.com/api/v1/highlights/123" \
 *       -H "Authorization: Bearer YOUR_API_KEY"
 */

/**
 * @api {patch} /api/v1/highlights/:id Update Highlight
 * @apiVersion 1.0.0
 * @apiName UpdateHighlight
 * @apiGroup Highlights
 * @apiDescription Update a highlight's text, note, color, or tags.
 *
 * @apiHeader {String} Authorization Bearer token (API key)
 *
 * @apiParam {Number} id Highlight ID
 *
 * @apiBody {String} [text] Updated highlight text
 * @apiBody {String} [note] Updated note (can be null to remove)
 * @apiBody {String} [color] Updated color
 * @apiBody {Number[]} [tags] Array of tag IDs to associate
 *
 * @apiSuccess {Boolean} success Always true
 * @apiSuccess {Object} data Empty object
 *
 * @apiError (400) ValidationError Invalid request data
 * @apiError (401) Unauthorized Invalid or missing API key
 * @apiError (404) NotFound Highlight not found
 * @apiError (429) RateLimitExceeded Rate limit exceeded
 *
 * @apiExample {curl} Example usage:
 *     curl -X PATCH "https://api.example.com/api/v1/highlights/123" \
 *       -H "Authorization: Bearer YOUR_API_KEY" \
 *       -H "Content-Type: application/json" \
 *       -d '{
 *         "note": "Updated note",
 *         "color": "blue"
 *       }'
 */

/**
 * @api {delete} /api/v1/highlights/:id Delete Highlight
 * @apiVersion 1.0.0
 * @apiName DeleteHighlight
 * @apiGroup Highlights
 * @apiDescription Permanently delete a highlight.
 *
 * @apiHeader {String} Authorization Bearer token (API key)
 *
 * @apiParam {Number} id Highlight ID
 *
 * @apiSuccess (204) NoContent Highlight deleted successfully
 *
 * @apiError (401) Unauthorized Invalid or missing API key
 * @apiError (404) NotFound Highlight not found
 * @apiError (429) RateLimitExceeded Rate limit exceeded
 *
 * @apiExample {curl} Example usage:
 *     curl -X DELETE "https://api.example.com/api/v1/highlights/123" \
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
} from '@/lib/api/response'
import {
  getHighlightById,
  updateHighlight,
  deleteHighlight,
} from '@/lib/db/highlights-store'

/**
 * GET /api/v1/highlights/[id]
 * Get a single highlight by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (auth) => {
    try {
      const id = parseInt(params.id)

      if (isNaN(id)) {
        return validationError('Invalid highlight ID')
      }

      const highlight = await getHighlightById(id)

      if (!highlight) {
        return notFoundError('Highlight')
      }

      return successResponse(highlight)
    } catch (error) {
      return handleApiError(error)
    }
  }, ['read'])
}

/**
 * PATCH /api/v1/highlights/[id]
 * Update a highlight
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (auth) => {
    try {
      const id = parseInt(params.id)

      if (isNaN(id)) {
        return validationError('Invalid highlight ID')
      }

      // Check if highlight exists
      const existing = await getHighlightById(id)
      if (!existing) {
        return notFoundError('Highlight')
      }

      const body = await request.json()

      // Validate at least one field is provided
      if (
        body.text === undefined &&
        body.note === undefined &&
        body.color === undefined &&
        body.tags === undefined
      ) {
        return validationError('At least one field must be provided for update')
      }

      // Validate text if provided
      if (body.text !== undefined) {
        if (typeof body.text !== 'string' || body.text.trim().length === 0) {
          return validationError('text must be a non-empty string', 'text')
        }
      }

      // Validate color if provided
      if (body.color !== undefined && typeof body.color !== 'string') {
        return validationError('color must be a string', 'color')
      }

      // Validate tags if provided
      if (body.tags !== undefined) {
        if (!Array.isArray(body.tags)) {
          return validationError('tags must be an array', 'tags')
        }
        if (!body.tags.every((tag: any) => typeof tag === 'number')) {
          return validationError('tags must be an array of numbers', 'tags')
        }
      }

      // Update highlight
      await updateHighlight(id, {
        text: body.text,
        note: body.note,
        color: body.color,
        tags: body.tags,
      })

      return successResponse({ message: 'Highlight updated successfully' })
    } catch (error) {
      return handleApiError(error)
    }
  }, ['write'])
}

/**
 * DELETE /api/v1/highlights/[id]
 * Delete a highlight
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (auth) => {
    try {
      const id = parseInt(params.id)

      if (isNaN(id)) {
        return validationError('Invalid highlight ID')
      }

      // Check if highlight exists
      const existing = await getHighlightById(id)
      if (!existing) {
        return notFoundError('Highlight')
      }

      // Delete highlight
      await deleteHighlight(id)

      return noContentResponse()
    } catch (error) {
      return handleApiError(error)
    }
  }, ['write'])
}
