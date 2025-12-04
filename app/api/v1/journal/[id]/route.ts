/**
 * @api {get} /api/v1/journal/:id Get Journal Entry
 * @apiVersion 1.0.0
 * @apiName GetJournalEntry
 * @apiGroup Journal
 * @apiDescription Retrieve a single journal entry by ID.
 *
 * @apiHeader {String} Authorization Bearer token (API key)
 *
 * @apiParam {Number} id Journal Entry ID
 *
 * @apiSuccess {Boolean} success Always true
 * @apiSuccess {Object} data Journal entry object
 *
 * @apiError (401) Unauthorized Invalid or missing API key
 * @apiError (404) NotFound Journal entry not found
 * @apiError (429) RateLimitExceeded Rate limit exceeded
 *
 * @apiExample {curl} Example usage:
 *     curl -X GET "https://api.example.com/api/v1/journal/123" \
 *       -H "Authorization: Bearer YOUR_API_KEY"
 */

/**
 * @api {patch} /api/v1/journal/:id Update Journal Entry
 * @apiVersion 1.0.0
 * @apiName UpdateJournalEntry
 * @apiGroup Journal
 * @apiDescription Update a journal entry's content, mood, or tags.
 *
 * @apiHeader {String} Authorization Bearer token (API key)
 *
 * @apiParam {Number} id Journal Entry ID
 *
 * @apiBody {String} [title] Updated entry title
 * @apiBody {String} [content] Updated entry content
 * @apiBody {String} [entryDate] Updated entry date (format: YYYY-MM-DD)
 * @apiBody {String} [entryTime] Updated entry time (format: HH:MM)
 * @apiBody {String} [mood] Updated mood
 * @apiBody {String} [weather] Updated weather
 * @apiBody {String} [location] Updated location
 * @apiBody {String} [activity] Updated activity
 * @apiBody {String[]} [tagNames] Updated tag names (replaces all existing tags)
 *
 * @apiSuccess {Boolean} success Always true
 * @apiSuccess {Object} data Updated journal entry object
 *
 * @apiError (400) ValidationError Invalid request data
 * @apiError (401) Unauthorized Invalid or missing API key
 * @apiError (404) NotFound Journal entry not found
 * @apiError (429) RateLimitExceeded Rate limit exceeded
 *
 * @apiExample {curl} Example usage:
 *     curl -X PATCH "https://api.example.com/api/v1/journal/123" \
 *       -H "Authorization: Bearer YOUR_API_KEY" \
 *       -H "Content-Type: application/json" \
 *       -d '{
 *         "mood": "good",
 *         "tagNames": ["updated", "tag"]
 *       }'
 */

/**
 * @api {delete} /api/v1/journal/:id Delete Journal Entry
 * @apiVersion 1.0.0
 * @apiName DeleteJournalEntry
 * @apiGroup Journal
 * @apiDescription Permanently delete a journal entry.
 *
 * @apiHeader {String} Authorization Bearer token (API key)
 *
 * @apiParam {Number} id Journal Entry ID
 *
 * @apiSuccess (204) NoContent Journal entry deleted successfully
 *
 * @apiError (401) Unauthorized Invalid or missing API key
 * @apiError (404) NotFound Journal entry not found
 * @apiError (429) RateLimitExceeded Rate limit exceeded
 *
 * @apiExample {curl} Example usage:
 *     curl -X DELETE "https://api.example.com/api/v1/journal/123" \
 *       -H "Authorization: Bearer YOUR_API_KEY"
 */

import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/auth'
import {
  successResponse,
  noContentResponse,
  notFoundError,
  validationError,
  handleApiError,
} from '@/lib/api/response'
import {
  getJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
} from '@/lib/db/journal-store'

/**
 * GET /api/v1/journal/[id]
 * Get a single journal entry by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (auth) => {
    try {
      const id = parseInt(params.id)

      if (isNaN(id)) {
        return validationError('Invalid journal entry ID')
      }

      const entry = await getJournalEntry(id)

      if (!entry) {
        return notFoundError('Journal entry')
      }

      return successResponse(entry)
    } catch (error) {
      return handleApiError(error)
    }
  }, ['read'])
}

/**
 * PATCH /api/v1/journal/[id]
 * Update a journal entry
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (auth) => {
    try {
      const id = parseInt(params.id)

      if (isNaN(id)) {
        return validationError('Invalid journal entry ID')
      }

      // Check if entry exists
      const existing = await getJournalEntry(id)
      if (!existing) {
        return notFoundError('Journal entry')
      }

      const body = await request.json()

      // Validate at least one field is provided
      if (
        body.title === undefined &&
        body.content === undefined &&
        body.entryDate === undefined &&
        body.entryTime === undefined &&
        body.mood === undefined &&
        body.weather === undefined &&
        body.location === undefined &&
        body.activity === undefined &&
        body.tagNames === undefined
      ) {
        return validationError('At least one field must be provided for update')
      }

      // Validate fields if provided
      if (body.title !== undefined) {
        if (typeof body.title !== 'string' || body.title.trim().length === 0) {
          return validationError('title must be a non-empty string', 'title')
        }
      }

      if (body.content !== undefined) {
        if (typeof body.content !== 'string' || body.content.trim().length === 0) {
          return validationError('content must be a non-empty string', 'content')
        }
      }

      if (body.entryDate !== undefined) {
        if (typeof body.entryDate !== 'string') {
          return validationError('entryDate must be a string (format: YYYY-MM-DD)', 'entryDate')
        }
      }

      if (body.entryTime !== undefined) {
        if (typeof body.entryTime !== 'string') {
          return validationError('entryTime must be a string (format: HH:MM)', 'entryTime')
        }
      }

      if (body.tagNames !== undefined) {
        if (!Array.isArray(body.tagNames)) {
          return validationError('tagNames must be an array', 'tagNames')
        }
        if (!body.tagNames.every((tag: any) => typeof tag === 'string')) {
          return validationError('tagNames must be an array of strings', 'tagNames')
        }
      }

      // Update journal entry
      const updated = await updateJournalEntry(id, {
        title: body.title,
        content: body.content,
        entryDate: body.entryDate,
        entryTime: body.entryTime,
        mood: body.mood,
        weather: body.weather,
        location: body.location,
        activity: body.activity,
        tagNames: body.tagNames,
      })

      return successResponse(updated)
    } catch (error) {
      return handleApiError(error)
    }
  }, ['write'])
}

/**
 * DELETE /api/v1/journal/[id]
 * Delete a journal entry
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (auth) => {
    try {
      const id = parseInt(params.id)

      if (isNaN(id)) {
        return validationError('Invalid journal entry ID')
      }

      // Check if entry exists
      const existing = await getJournalEntry(id)
      if (!existing) {
        return notFoundError('Journal entry')
      }

      // Delete journal entry
      await deleteJournalEntry(id)

      return noContentResponse()
    } catch (error) {
      return handleApiError(error)
    }
  }, ['write'])
}
