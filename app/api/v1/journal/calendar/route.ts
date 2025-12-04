/**
 * @api {get} /api/v1/journal/calendar Get Journal Calendar Data
 * @apiVersion 1.0.0
 * @apiName GetJournalCalendar
 * @apiGroup Journal
 * @apiDescription Get calendar data showing which days have journal entries for a specific month.
 *
 * @apiHeader {String} Authorization Bearer token (API key)
 *
 * @apiQuery {Number} [year] Year (defaults to current year, format: YYYY)
 * @apiQuery {Number} [month] Month (defaults to current month, range: 1-12)
 *
 * @apiSuccess {Boolean} success Always true
 * @apiSuccess {Object[]} data Array of calendar day objects
 * @apiSuccess {String} data.date Date of the entry (format: YYYY-MM-DD)
 * @apiSuccess {Number} data.count Number of entries on that date
 *
 * @apiError (400) ValidationError Invalid year or month
 * @apiError (401) Unauthorized Invalid or missing API key
 * @apiError (429) RateLimitExceeded Rate limit exceeded
 * @apiError (500) InternalError Internal server error
 *
 * @apiExample {curl} Example usage - Current month:
 *     curl -X GET "https://api.example.com/api/v1/journal/calendar" \
 *       -H "Authorization: Bearer YOUR_API_KEY"
 *
 * @apiExample {curl} Example usage - Specific month:
 *     curl -X GET "https://api.example.com/api/v1/journal/calendar?year=2025&month=12" \
 *       -H "Authorization: Bearer YOUR_API_KEY"
 *
 * @apiSuccessExample {json} Success Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "data": [
 *         {
 *           "date": "2025-12-01",
 *           "count": 1
 *         },
 *         {
 *           "date": "2025-12-02",
 *           "count": 2
 *         },
 *         {
 *           "date": "2025-12-04",
 *           "count": 1
 *         }
 *       ]
 *     }
 */

import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/auth'
import {
  successResponse,
  validationError,
  handleApiError,
} from '@/lib/api/response'
import { getCalendarData } from '@/lib/db/journal-store'

/**
 * GET /api/v1/journal/calendar
 * Get calendar data for a specific month
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (auth) => {
    try {
      const searchParams = request.nextUrl.searchParams

      // Get current date for defaults
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1 // getMonth() returns 0-11

      // Parse year and month
      const year = parseInt(searchParams.get('year') || currentYear.toString(), 10)
      const month = parseInt(searchParams.get('month') || currentMonth.toString(), 10)

      // Validate year
      if (isNaN(year) || year < 1900 || year > 2100) {
        return validationError('Invalid year. Must be between 1900 and 2100')
      }

      // Validate month
      if (isNaN(month) || month < 1 || month > 12) {
        return validationError('Invalid month. Must be between 1 and 12')
      }

      // Get calendar data
      const calendarData = await getCalendarData(year, month)

      return successResponse(calendarData)
    } catch (error) {
      return handleApiError(error)
    }
  }, ['read'])
}
