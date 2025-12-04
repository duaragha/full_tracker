/**
 * @api {get} /api/v1/journal/stats Get Journal Statistics
 * @apiVersion 1.0.0
 * @apiName GetJournalStats
 * @apiGroup Journal
 * @apiDescription Get aggregated statistics about journal entries.
 *
 * @apiHeader {String} Authorization Bearer token (API key)
 *
 * @apiSuccess {Boolean} success Always true
 * @apiSuccess {Object} data Statistics object
 * @apiSuccess {Number} data.totalEntries Total number of journal entries
 * @apiSuccess {Number} data.totalWords Total words written across all entries
 * @apiSuccess {Number} data.averageWordCount Average words per entry
 * @apiSuccess {String} data.averageMood Average mood across all entries
 * @apiSuccess {String[]} data.entryDates List of dates that have journal entries
 * @apiSuccess {Object[]} data.topTags Top 10 most used tags
 * @apiSuccess {String} data.topTags.name Tag name
 * @apiSuccess {Number} data.topTags.count Usage count
 * @apiSuccess {Object} data.moodDistribution Distribution of moods
 * @apiSuccess {Number} data.moodDistribution.great Count of "great" mood entries
 * @apiSuccess {Number} data.moodDistribution.good Count of "good" mood entries
 * @apiSuccess {Number} data.moodDistribution.okay Count of "okay" mood entries
 * @apiSuccess {Number} data.moodDistribution.bad Count of "bad" mood entries
 * @apiSuccess {Number} data.moodDistribution.terrible Count of "terrible" mood entries
 *
 * @apiError (401) Unauthorized Invalid or missing API key
 * @apiError (429) RateLimitExceeded Rate limit exceeded
 * @apiError (500) InternalError Internal server error
 *
 * @apiExample {curl} Example usage:
 *     curl -X GET "https://api.example.com/api/v1/journal/stats" \
 *       -H "Authorization: Bearer YOUR_API_KEY"
 *
 * @apiSuccessExample {json} Success Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "data": {
 *         "totalEntries": 50,
 *         "totalWords": 15000,
 *         "averageWordCount": 300,
 *         "averageMood": "good",
 *         "entryDates": [
 *           "2025-12-04",
 *           "2025-12-03",
 *           "2025-12-02"
 *         ],
 *         "topTags": [
 *           {
 *             "name": "gratitude",
 *             "count": 25
 *           },
 *           {
 *             "name": "reflection",
 *             "count": 18
 *           }
 *         ],
 *         "moodDistribution": {
 *           "great": 15,
 *           "good": 20,
 *           "okay": 10,
 *           "bad": 3,
 *           "terrible": 2
 *         }
 *       }
 *     }
 */

import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/auth'
import {
  successResponse,
  handleApiError,
} from '@/lib/api/response'
import { getJournalStats } from '@/lib/db/journal-store'

/**
 * GET /api/v1/journal/stats
 * Get journal statistics
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const stats = await getJournalStats()
      return successResponse(stats)
    } catch (error) {
      return handleApiError(error)
    }
  }, ['read'])
}
