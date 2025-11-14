import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

export interface ReviewCard {
  id: number
  highlightId: number
  easinessFactor: number
  intervalDays: number
  repetitions: number
  nextReviewDate: string
  lastReviewedAt: string | null
  totalReviews: number
  correctReviews: number
  isActive: boolean
  isSuspended: boolean
  createdAt: string
  updatedAt: string
}

export interface ReviewQueueItem {
  cardId: number
  highlightId: number
  highlightText: string
  highlightNote: string | null
  sourceTitle: string
  sourceAuthor: string | null
  sourceType: string
  easinessFactor: number
  intervalDays: number
  repetitions: number
  lastReviewedAt: string | null
}

export interface ReviewStats {
  dueToday: number
  totalReviews: number
  correctReviews: number
  currentStreak: number
  nextReviewDate: string | null
}

/**
 * Get reviews due by a specific date
 */
export async function getDueReviews(dueDate?: Date): Promise<ReviewQueueItem[]> {
  const date = dueDate || new Date()
  const dateStr = date.toISOString().split('T')[0]

  const result = await pool.query(
    `SELECT
      rc.id as card_id,
      rc.highlight_id,
      h.text as highlight_text,
      h.note as highlight_note,
      s.title as source_title,
      s.author as source_author,
      s.source_type,
      rc.easiness_factor,
      rc.interval_days,
      rc.repetitions,
      rc.last_reviewed_at
    FROM review_cards rc
    INNER JOIN highlights h ON h.id = rc.highlight_id
    INNER JOIN sources s ON s.id = h.source_id
    WHERE rc.next_review_date <= $1
      AND rc.is_active = TRUE
      AND rc.is_suspended = FALSE
      AND h.is_archived = FALSE
    ORDER BY rc.next_review_date ASC, rc.last_reviewed_at ASC NULLS FIRST
    LIMIT 50`,
    [dateStr]
  )

  return result.rows.map(row => ({
    cardId: row.card_id,
    highlightId: row.highlight_id,
    highlightText: row.highlight_text,
    highlightNote: row.highlight_note,
    sourceTitle: row.source_title,
    sourceAuthor: row.source_author,
    sourceType: row.source_type,
    easinessFactor: parseFloat(row.easiness_factor),
    intervalDays: row.interval_days,
    repetitions: row.repetitions,
    lastReviewedAt: row.last_reviewed_at?.toISOString() || null,
  }))
}

/**
 * Submit a review for a highlight (using SM-2 algorithm)
 * Quality: 0-5 scale
 * 0 = complete blackout
 * 1 = incorrect response, but correct on recall
 * 2 = incorrect response, correct seemed easy to recall
 * 3 = correct response, but required significant difficulty
 * 4 = correct response, with some hesitation
 * 5 = perfect response
 */
export async function submitReview(
  cardId: number,
  quality: number,
  timeTakenSeconds?: number
): Promise<void> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Get current values
    const cardResult = await client.query(
      `SELECT easiness_factor, interval_days, repetitions
       FROM review_cards
       WHERE id = $1`,
      [cardId]
    )

    if (cardResult.rows.length === 0) {
      throw new Error('Review card not found')
    }

    const oldEf = parseFloat(cardResult.rows[0].easiness_factor)
    const oldInterval = cardResult.rows[0].interval_days
    const oldRepetitions = cardResult.rows[0].repetitions

    // Calculate new easiness factor (SM-2 algorithm)
    let newEf = oldEf + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    newEf = Math.max(1.3, newEf) // Minimum EF is 1.3

    // Calculate new interval and repetitions
    let newInterval: number
    let newRepetitions: number

    if (quality >= 3) {
      // Correct response
      if (oldRepetitions === 0) {
        newInterval = 1
      } else if (oldRepetitions === 1) {
        newInterval = 6
      } else {
        newInterval = Math.round(oldInterval * newEf)
      }
      newRepetitions = oldRepetitions + 1
    } else {
      // Incorrect response - reset
      newInterval = 1
      newRepetitions = 0
    }

    // Update review card
    await client.query(
      `UPDATE review_cards
       SET easiness_factor = $1,
           interval_days = $2,
           repetitions = $3,
           next_review_date = CURRENT_DATE + $2,
           last_reviewed_at = NOW(),
           total_reviews = total_reviews + 1,
           correct_reviews = correct_reviews + CASE WHEN $4 >= 3 THEN 1 ELSE 0 END,
           updated_at = NOW()
       WHERE id = $5`,
      [newEf, newInterval, newRepetitions, quality, cardId]
    )

    // Insert history record
    await client.query(
      `INSERT INTO review_history (
        review_card_id,
        quality,
        response_time_ms,
        easiness_factor_before,
        interval_days_before,
        easiness_factor_after,
        interval_days_after
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        cardId,
        quality,
        timeTakenSeconds ? timeTakenSeconds * 1000 : null,
        oldEf,
        oldInterval,
        newEf,
        newInterval,
      ]
    )

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Get review statistics
 */
export async function getReviewStats(): Promise<ReviewStats> {
  const today = new Date().toISOString().split('T')[0]

  // Get due today count
  const dueResult = await pool.query(
    `SELECT COUNT(*) as count
     FROM review_cards rc
     INNER JOIN highlights h ON h.id = rc.highlight_id
     WHERE rc.next_review_date <= $1
       AND rc.is_active = TRUE
       AND rc.is_suspended = FALSE
       AND h.is_archived = FALSE`,
    [today]
  )

  // Get total reviews and correct reviews
  const statsResult = await pool.query(
    `SELECT
       COALESCE(SUM(total_reviews), 0) as total_reviews,
       COALESCE(SUM(correct_reviews), 0) as correct_reviews
     FROM review_cards`
  )

  // Get current streak (consecutive days with reviews)
  const streakResult = await pool.query(
    `WITH review_dates AS (
      SELECT DISTINCT DATE(reviewed_at) as review_date
      FROM review_history
      WHERE reviewed_at >= CURRENT_DATE - INTERVAL '365 days'
      ORDER BY review_date DESC
    ),
    streak_calc AS (
      SELECT
        review_date,
        review_date - ROW_NUMBER() OVER (ORDER BY review_date DESC)::INTEGER as streak_group
      FROM review_dates
    )
    SELECT COUNT(*) as streak
    FROM streak_calc
    WHERE streak_group = (
      SELECT streak_group
      FROM streak_calc
      WHERE review_date = CURRENT_DATE
      LIMIT 1
    )`
  )

  // Get next review date
  const nextReviewResult = await pool.query(
    `SELECT MIN(next_review_date) as next_date
     FROM review_cards rc
     INNER JOIN highlights h ON h.id = rc.highlight_id
     WHERE rc.next_review_date > $1
       AND rc.is_active = TRUE
       AND rc.is_suspended = FALSE
       AND h.is_archived = FALSE`,
    [today]
  )

  return {
    dueToday: parseInt(dueResult.rows[0].count),
    totalReviews: parseInt(statsResult.rows[0].total_reviews),
    correctReviews: parseInt(statsResult.rows[0].correct_reviews),
    currentStreak: streakResult.rows.length > 0 ? parseInt(streakResult.rows[0].streak || 0) : 0,
    nextReviewDate: nextReviewResult.rows[0].next_date || null,
  }
}

/**
 * Skip a review (defer to tomorrow)
 */
export async function skipReview(cardId: number): Promise<void> {
  await pool.query(
    `UPDATE review_cards
     SET next_review_date = CURRENT_DATE + 1,
         updated_at = NOW()
     WHERE id = $1`,
    [cardId]
  )
}

/**
 * Enable review for a highlight
 */
export async function enableReviewForHighlight(highlightId: number): Promise<void> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Check if review card already exists
    const existing = await client.query(
      'SELECT id FROM review_cards WHERE highlight_id = $1',
      [highlightId]
    )

    if (existing.rows.length === 0) {
      // Create new review card
      await client.query(
        `INSERT INTO review_cards (
          highlight_id,
          easiness_factor,
          interval_days,
          repetitions,
          next_review_date,
          is_active,
          created_at,
          updated_at
        ) VALUES ($1, 2.5, 0, 0, CURRENT_DATE, TRUE, NOW(), NOW())`,
        [highlightId]
      )
    } else {
      // Reactivate existing card
      await client.query(
        `UPDATE review_cards
         SET is_active = TRUE,
             is_suspended = FALSE,
             updated_at = NOW()
         WHERE highlight_id = $1`,
        [highlightId]
      )
    }

    // Update highlight
    await client.query(
      `UPDATE highlights
       SET review_enabled = TRUE,
           updated_at = NOW()
       WHERE id = $1`,
      [highlightId]
    )

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Disable review for a highlight
 */
export async function disableReviewForHighlight(highlightId: number): Promise<void> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    await client.query(
      `UPDATE review_cards
       SET is_active = FALSE,
           updated_at = NOW()
       WHERE highlight_id = $1`,
      [highlightId]
    )

    await client.query(
      `UPDATE highlights
       SET review_enabled = FALSE,
           updated_at = NOW()
       WHERE id = $1`,
      [highlightId]
    )

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
