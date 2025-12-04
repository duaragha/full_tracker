/**
 * @api {get} /api/v1/journal/tags Get All Journal Tags
 * @apiVersion 1.0.0
 * @apiName GetJournalTags
 * @apiGroup Journal
 * @apiDescription Get all available journal tags or search for tags by name.
 *
 * @apiHeader {String} Authorization Bearer token (API key)
 *
 * @apiQuery {String} [q] Search query to filter tags by name (case-insensitive)
 *
 * @apiSuccess {Boolean} success Always true
 * @apiSuccess {Object[]} data Array of tag objects
 * @apiSuccess {Number} data.id Tag ID
 * @apiSuccess {String} data.name Tag name
 * @apiSuccess {Number} data.usageCount Number of times this tag is used
 * @apiSuccess {String} data.createdAt Tag creation timestamp
 *
 * @apiError (401) Unauthorized Invalid or missing API key
 * @apiError (429) RateLimitExceeded Rate limit exceeded
 * @apiError (500) InternalError Internal server error
 *
 * @apiExample {curl} Example usage - Get all tags:
 *     curl -X GET "https://api.example.com/api/v1/journal/tags" \
 *       -H "Authorization: Bearer YOUR_API_KEY"
 *
 * @apiExample {curl} Example usage - Search tags:
 *     curl -X GET "https://api.example.com/api/v1/journal/tags?q=gratitude" \
 *       -H "Authorization: Bearer YOUR_API_KEY"
 *
 * @apiSuccessExample {json} Success Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "data": [
 *         {
 *           "id": 1,
 *           "name": "gratitude",
 *           "usageCount": 25,
 *           "createdAt": "2025-11-01T10:00:00Z"
 *         },
 *         {
 *           "id": 2,
 *           "name": "reflection",
 *           "usageCount": 18,
 *           "createdAt": "2025-11-02T14:30:00Z"
 *         }
 *       ]
 *     }
 */

import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/auth'
import {
  successResponse,
  handleApiError,
} from '@/lib/api/response'
import {
  getJournalTags,
  searchTags,
} from '@/lib/db/journal-store'

/**
 * GET /api/v1/journal/tags
 * Get all tags or search for tags by name
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const searchParams = request.nextUrl.searchParams
      const query = searchParams.get('q')

      let tags
      if (query) {
        tags = await searchTags(query)
      } else {
        tags = await getJournalTags()
      }

      return successResponse(tags)
    } catch (error) {
      return handleApiError(error)
    }
  }, ['read'])
}
