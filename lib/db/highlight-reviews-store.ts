import { Pool } from 'pg'
import { calculateSM2, calculateNextReviewDate, SM2Input } from '@/lib/spaced-repetition/sm2'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

export interface HighlightReview {
  id: number
  highlightId: number
  nextReviewAt: string
  interval: number
  repetitions: number
  easinessFactor: number
  reviewCount: number
  lastReviewedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface HighlightReviewWithHighlight extends HighlightReview {
  highlight: {
    id: number
    text: string
    note: string | null
    color: string
    sourceId: number
    sourceTitle: string
    sourceAuthor: string | null
    sourceType: string
  }
}

export interface ReviewStats {
  totalReviews: number
  dueToday: number
  dueThisWeek: number
  reviewedToday: number
  reviewedThisWeek: number
  reviewedThisMonth: number
  averageEasinessFactor: number
  totalHighlightsWithReviews: number
}

/**
 * Get highlights due for review
 *
 * @param limit Maximum number of reviews to return (default: all)
 * @param dueDate Only return reviews due on or before this date (default: today)
 * @returns Array of reviews with highlight details
 */
export async function getDueReviews(
  limit?: number,
  dueDate?: string
): Promise<HighlightReviewWithHighlight[]> {
  const today = dueDate || new Date().toISOString().split('T')[0]

  let query = `
    SELECT
      hr.id,
      hr.highlight_id,
      hr.next_review_at,
      hr.interval,
      hr.repetitions,
      hr.easiness_factor,
      hr.review_count,
      hr.last_reviewed_at,
      hr.created_at,
      hr.updated_at,
      h.id as highlight_id,
      h.text as highlight_text,
      h.note as highlight_note,
      h.color as highlight_color,
      h.source_id,
      s.title as source_title,
      s.author as source_author,
      s.source_type
    FROM highlight_reviews hr
    INNER JOIN highlights h ON hr.highlight_id = h.id
    INNER JOIN sources s ON h.source_id = s.id
    WHERE hr.next_review_at <= $1
    ORDER BY hr.next_review_at ASC, hr.id ASC
  `

  const params: any[] = [today]

  if (limit && limit > 0) {
    query += ` LIMIT $2`
    params.push(limit)
  }

  const result = await pool.query(query, params)

  return result.rows.map(row => ({
    id: row.id,
    highlightId: row.highlight_id,
    nextReviewAt: row.next_review_at,
    interval: row.interval,
    repetitions: row.repetitions,
    easinessFactor: parseFloat(row.easiness_factor),
    reviewCount: row.review_count,
    lastReviewedAt: row.last_reviewed_at ? row.last_reviewed_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    highlight: {
      id: row.highlight_id,
      text: row.highlight_text,
      note: row.highlight_note,
      color: row.highlight_color || 'yellow',
      sourceId: row.source_id,
      sourceTitle: row.source_title,
      sourceAuthor: row.source_author,
      sourceType: row.source_type,
    }
  }))
}

/**
 * Update review statistics after user submits a review rating
 * Uses SM-2 algorithm to calculate next review date
 *
 * @param highlightId ID of the highlight being reviewed
 * @param rating User's quality rating (0-5)
 * @returns Updated review record
 */
export async function updateReviewResult(
  highlightId: number,
  rating: number
): Promise<HighlightReview> {
  // Validate rating
  if (rating < 0 || rating > 5) {
    throw new Error('Rating must be between 0 and 5')
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Get current review state
    const currentReview = await client.query(
      `SELECT * FROM highlight_reviews WHERE highlight_id = $1`,
      [highlightId]
    )

    if (currentReview.rows.length === 0) {
      throw new Error(`No review found for highlight ${highlightId}`)
    }

    const current = currentReview.rows[0]

    // Prepare SM-2 input
    const sm2Input: SM2Input = {
      quality: rating,
      repetitions: current.repetitions || 0,
      easinessFactor: parseFloat(current.easiness_factor) || 2.5,
      interval: current.interval || 0
    }

    // Calculate new SM-2 values
    const sm2Result = calculateSM2(sm2Input)

    // Calculate next review date
    const nextReviewDate = calculateNextReviewDate(sm2Result.interval)

    // Update the review record
    const updateResult = await client.query(
      `UPDATE highlight_reviews
       SET
         next_review_at = $1,
         interval = $2,
         repetitions = $3,
         easiness_factor = $4,
         review_count = review_count + 1,
         last_reviewed_at = NOW(),
         updated_at = NOW()
       WHERE highlight_id = $5
       RETURNING *`,
      [
        nextReviewDate,
        sm2Result.interval,
        sm2Result.repetitions,
        sm2Result.easinessFactor,
        highlightId
      ]
    )

    await client.query('COMMIT')

    const row = updateResult.rows[0]
    return {
      id: row.id,
      highlightId: row.highlight_id,
      nextReviewAt: row.next_review_at,
      interval: row.interval,
      repetitions: row.repetitions,
      easinessFactor: parseFloat(row.easiness_factor),
      reviewCount: row.review_count,
      lastReviewedAt: row.last_reviewed_at ? row.last_reviewed_at.toISOString() : null,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Get comprehensive review statistics
 *
 * @returns Statistics about the review system
 */
export async function getReviewStats(): Promise<ReviewStats> {
  const today = new Date().toISOString().split('T')[0]
  const weekFromNow = new Date()
  weekFromNow.setDate(weekFromNow.getDate() + 7)
  const weekFromNowStr = weekFromNow.toISOString().split('T')[0]

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const startOfWeek = new Date()
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()) // Sunday
  startOfWeek.setHours(0, 0, 0, 0)

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const queries = [
    // Total reviews
    pool.query(`SELECT COUNT(*) as count FROM highlight_reviews`),

    // Due today
    pool.query(
      `SELECT COUNT(*) as count FROM highlight_reviews WHERE next_review_at <= $1`,
      [today]
    ),

    // Due this week
    pool.query(
      `SELECT COUNT(*) as count FROM highlight_reviews WHERE next_review_at <= $1`,
      [weekFromNowStr]
    ),

    // Reviewed today
    pool.query(
      `SELECT COUNT(*) as count FROM highlight_reviews
       WHERE last_reviewed_at >= $1`,
      [startOfToday.toISOString()]
    ),

    // Reviewed this week
    pool.query(
      `SELECT COUNT(*) as count FROM highlight_reviews
       WHERE last_reviewed_at >= $1`,
      [startOfWeek.toISOString()]
    ),

    // Reviewed this month
    pool.query(
      `SELECT COUNT(*) as count FROM highlight_reviews
       WHERE last_reviewed_at >= $1`,
      [startOfMonth.toISOString()]
    ),

    // Average easiness factor
    pool.query(
      `SELECT AVG(easiness_factor) as avg_ef FROM highlight_reviews WHERE review_count > 0`
    ),

    // Total highlights with reviews
    pool.query(
      `SELECT COUNT(DISTINCT highlight_id) as count FROM highlight_reviews`
    ),
  ]

  const results = await Promise.all(queries)

  return {
    totalReviews: parseInt(results[0].rows[0].count),
    dueToday: parseInt(results[1].rows[0].count),
    dueThisWeek: parseInt(results[2].rows[0].count),
    reviewedToday: parseInt(results[3].rows[0].count),
    reviewedThisWeek: parseInt(results[4].rows[0].count),
    reviewedThisMonth: parseInt(results[5].rows[0].count),
    averageEasinessFactor: results[6].rows[0].avg_ef
      ? parseFloat(results[6].rows[0].avg_ef).toFixed(2) as any
      : 2.5,
    totalHighlightsWithReviews: parseInt(results[7].rows[0].count),
  }
}

/**
 * Get review by highlight ID
 *
 * @param highlightId ID of the highlight
 * @returns Review record or null if not found
 */
export async function getReviewByHighlightId(
  highlightId: number
): Promise<HighlightReview | null> {
  const result = await pool.query(
    `SELECT * FROM highlight_reviews WHERE highlight_id = $1`,
    [highlightId]
  )

  if (result.rows.length === 0) {
    return null
  }

  const row = result.rows[0]
  return {
    id: row.id,
    highlightId: row.highlight_id,
    nextReviewAt: row.next_review_at,
    interval: row.interval,
    repetitions: row.repetitions,
    easinessFactor: parseFloat(row.easiness_factor),
    reviewCount: row.review_count,
    lastReviewedAt: row.last_reviewed_at ? row.last_reviewed_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

/**
 * Create a new review entry for a highlight
 *
 * @param highlightId ID of the highlight
 * @returns Created review record
 */
export async function createReview(highlightId: number): Promise<HighlightReview> {
  const nextReviewDate = calculateNextReviewDate(1) // Review tomorrow

  const result = await pool.query(
    `INSERT INTO highlight_reviews (
      highlight_id,
      next_review_at,
      interval,
      repetitions,
      easiness_factor,
      review_count,
      created_at,
      updated_at
    )
    VALUES ($1, $2, 1, 0, 2.5, 0, NOW(), NOW())
    ON CONFLICT (highlight_id) DO NOTHING
    RETURNING *`,
    [highlightId, nextReviewDate]
  )

  if (result.rows.length === 0) {
    // Review already exists, fetch it
    return (await getReviewByHighlightId(highlightId))!
  }

  const row = result.rows[0]
  return {
    id: row.id,
    highlightId: row.highlight_id,
    nextReviewAt: row.next_review_at,
    interval: row.interval,
    repetitions: row.repetitions,
    easinessFactor: parseFloat(row.easiness_factor),
    reviewCount: row.review_count,
    lastReviewedAt: row.last_reviewed_at ? row.last_reviewed_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

/**
 * Reset a review back to initial state
 *
 * @param highlightId ID of the highlight
 * @returns Updated review record
 */
export async function resetReview(highlightId: number): Promise<HighlightReview> {
  const nextReviewDate = calculateNextReviewDate(1)

  const result = await pool.query(
    `UPDATE highlight_reviews
     SET
       next_review_at = $1,
       interval = 1,
       repetitions = 0,
       easiness_factor = 2.5,
       review_count = 0,
       last_reviewed_at = NULL,
       updated_at = NOW()
     WHERE highlight_id = $2
     RETURNING *`,
    [nextReviewDate, highlightId]
  )

  if (result.rows.length === 0) {
    throw new Error(`No review found for highlight ${highlightId}`)
  }

  const row = result.rows[0]
  return {
    id: row.id,
    highlightId: row.highlight_id,
    nextReviewAt: row.next_review_at,
    interval: row.interval,
    repetitions: row.repetitions,
    easinessFactor: parseFloat(row.easiness_factor),
    reviewCount: row.review_count,
    lastReviewedAt: row.last_reviewed_at ? row.last_reviewed_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}
