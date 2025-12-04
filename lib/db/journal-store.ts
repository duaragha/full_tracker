import { Pool } from 'pg'
import {
  JournalEntry,
  JournalEntryCreate,
  JournalEntryUpdate,
  JournalFilters,
  JournalStats,
  JournalTag,
  Mood,
} from '@/types/journal'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

/**
 * Normalizes a database row to a JournalEntry object
 */
function normalizeEntry(row: any): JournalEntry {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    wordCount: row.word_count || 0,
    entryDate: row.entry_date instanceof Date
      ? row.entry_date.toISOString().split('T')[0]
      : row.entry_date,
    entryTime: row.entry_time instanceof Date
      ? row.entry_time.toISOString().split('T')[1].slice(0, 5)
      : row.entry_time,
    mood: row.mood || undefined,
    weather: row.weather || undefined,
    location: row.location || undefined,
    activity: row.activity || undefined,
    tags: (() => {
      try {
        return row.tags && row.tags !== '' ? JSON.parse(row.tags) : []
      } catch {
        return []
      }
    })(),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

/**
 * Normalizes a database row to a JournalTag object
 */
function normalizeTag(row: any): JournalTag {
  return {
    id: row.id,
    name: row.name,
    usageCount: row.usage_count || 0,
    createdAt: row.created_at.toISOString(),
  }
}

/**
 * Create a new journal entry
 */
export async function createJournalEntry(data: JournalEntryCreate): Promise<JournalEntry> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Insert the journal entry
    const entryResult = await client.query(
      `INSERT INTO journal_entries (
        title, content, entry_date, entry_time, mood, weather, location, activity,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *`,
      [
        data.title,
        data.content,
        data.entryDate,
        data.entryTime,
        data.mood || null,
        data.weather || null,
        data.location || null,
        data.activity || null,
      ]
    )

    const entryId = entryResult.rows[0].id
    const entry = normalizeEntry(entryResult.rows[0])

    // Handle tags if provided
    if (data.tagNames && data.tagNames.length > 0) {
      // Get or create tags
      const tagIds: number[] = []
      for (const tagName of data.tagNames) {
        const tagResult = await client.query(
          `INSERT INTO journal_tags (name, created_at)
           VALUES ($1, NOW())
           ON CONFLICT (name) DO UPDATE SET usage_count = usage_count
           RETURNING id`,
          [tagName]
        )
        tagIds.push(tagResult.rows[0].id)
      }

      // Associate tags with entry
      if (tagIds.length > 0) {
        const tagValues = tagIds.map((_, idx) => `($1, $${idx + 2})`).join(', ')
        const tagParams = [entryId, ...tagIds]
        await client.query(
          `INSERT INTO journal_entry_tags (entry_id, tag_id)
           VALUES ${tagValues}
           ON CONFLICT DO NOTHING`,
          tagParams
        )
      }
    }

    await client.query('COMMIT')
    const createdEntry = await getJournalEntry(entryId)
    return createdEntry || entry
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Get a journal entry by ID with its tags
 */
export async function getJournalEntry(id: number): Promise<JournalEntry | null> {
  const result = await pool.query(
    `SELECT
      je.*,
      COALESCE(
        json_agg(
          json_build_object('id', jt.id, 'name', jt.name, 'usageCount', jt.usage_count, 'createdAt', jt.created_at)
        ) FILTER (WHERE jt.id IS NOT NULL),
        '[]'
      ) as tags
    FROM journal_entries je
    LEFT JOIN journal_entry_tags jet ON je.id = jet.entry_id
    LEFT JOIN journal_tags jt ON jet.tag_id = jt.id
    WHERE je.id = $1
    GROUP BY je.id`,
    [id]
  )

  return result.rows.length > 0 ? normalizeEntry(result.rows[0]) : null
}

/**
 * Get journal entries with filtering, searching, and pagination
 */
export async function getJournalEntries(
  filters?: JournalFilters,
  page: number = 1,
  limit: number = 20
): Promise<{ entries: JournalEntry[]; total: number }> {
  // Validate pagination parameters
  const validLimit = Math.min(Math.max(limit, 1), 100) // Max 100 per page
  const validPage = Math.max(page, 1)
  const offset = (validPage - 1) * validLimit

  let query = `
    SELECT
      je.*,
      COALESCE(
        json_agg(
          json_build_object('id', jt.id, 'name', jt.name, 'usageCount', jt.usage_count, 'createdAt', jt.created_at)
        ) FILTER (WHERE jt.id IS NOT NULL),
        '[]'
      ) as tags
    FROM journal_entries je
    LEFT JOIN journal_entry_tags jet ON je.id = jet.entry_id
    LEFT JOIN journal_tags jt ON jet.tag_id = jt.id
    WHERE 1=1
  `

  const params: any[] = []
  let paramIndex = 1

  // Apply filters
  if (filters?.mood) {
    query += ` AND je.mood = $${paramIndex}`
    params.push(filters.mood)
    paramIndex++
  }

  if (filters?.startDate) {
    query += ` AND je.entry_date >= $${paramIndex}`
    params.push(filters.startDate)
    paramIndex++
  }

  if (filters?.endDate) {
    query += ` AND je.entry_date <= $${paramIndex}`
    params.push(filters.endDate)
    paramIndex++
  }

  // Full-text search on title and content
  if (filters?.searchText) {
    query += ` AND to_tsvector('english', je.title || ' ' || je.content) @@ plainto_tsquery('english', $${paramIndex})`
    params.push(filters.searchText)
    paramIndex++
  }

  // Filter by tags (all tags must be present)
  if (filters?.tags && filters.tags.length > 0) {
    query += ` AND je.id IN (
      SELECT entry_id FROM journal_entry_tags jet
      JOIN journal_tags jt ON jet.tag_id = jt.id
      WHERE jt.name = ANY($${paramIndex})
      GROUP BY jet.entry_id
      HAVING COUNT(DISTINCT jt.id) = $${paramIndex + 1}
    )`
    params.push(filters.tags, filters.tags.length)
    paramIndex += 2
  }

  // Get total count before applying limit/offset
  const countQuery = query.replace(
    /SELECT.*?FROM journal_entries/,
    'SELECT COUNT(DISTINCT je.id) as count FROM journal_entries'
  )
  const countResult = await pool.query(countQuery, params)
  const total = parseInt(countResult.rows[0].count, 10)

  // Add grouping and ordering
  query += ` GROUP BY je.id ORDER BY je.entry_date DESC, je.entry_time DESC`

  // Add pagination
  query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
  params.push(validLimit, offset)

  const result = await pool.query(query, params)
  const entries = result.rows.map(normalizeEntry)

  return { entries, total }
}

/**
 * Update a journal entry
 */
export async function updateJournalEntry(id: number, data: JournalEntryUpdate): Promise<JournalEntry> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Build dynamic update query
    const updates: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex}`)
      params.push(data.title)
      paramIndex++
    }

    if (data.content !== undefined) {
      updates.push(`content = $${paramIndex}`)
      params.push(data.content)
      paramIndex++
    }

    if (data.entryDate !== undefined) {
      updates.push(`entry_date = $${paramIndex}`)
      params.push(data.entryDate)
      paramIndex++
    }

    if (data.entryTime !== undefined) {
      updates.push(`entry_time = $${paramIndex}`)
      params.push(data.entryTime)
      paramIndex++
    }

    if (data.mood !== undefined) {
      updates.push(`mood = $${paramIndex}`)
      params.push(data.mood || null)
      paramIndex++
    }

    if (data.weather !== undefined) {
      updates.push(`weather = $${paramIndex}`)
      params.push(data.weather || null)
      paramIndex++
    }

    if (data.location !== undefined) {
      updates.push(`location = $${paramIndex}`)
      params.push(data.location || null)
      paramIndex++
    }

    if (data.activity !== undefined) {
      updates.push(`activity = $${paramIndex}`)
      params.push(data.activity || null)
      paramIndex++
    }

    // Always update the updated_at timestamp
    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`)
      params.push(id)

      const updateQuery = `UPDATE journal_entries SET ${updates.join(', ')} WHERE id = $${paramIndex}`
      await client.query(updateQuery, params)
    }

    // Handle tags if provided
    if (data.tagNames !== undefined) {
      // Remove existing tags
      await client.query('DELETE FROM journal_entry_tags WHERE entry_id = $1', [id])

      // Add new tags
      if (data.tagNames.length > 0) {
        const tagIds: number[] = []
        for (const tagName of data.tagNames) {
          const tagResult = await client.query(
            `INSERT INTO journal_tags (name, created_at)
             VALUES ($1, NOW())
             ON CONFLICT (name) DO UPDATE SET usage_count = usage_count
             RETURNING id`,
            [tagName]
          )
          tagIds.push(tagResult.rows[0].id)
        }

        if (tagIds.length > 0) {
          const tagValues = tagIds.map((_, idx) => `($1, $${idx + 2})`).join(', ')
          const tagParams = [id, ...tagIds]
          await client.query(
            `INSERT INTO journal_entry_tags (entry_id, tag_id)
             VALUES ${tagValues}
             ON CONFLICT DO NOTHING`,
            tagParams
          )
        }
      }
    }

    await client.query('COMMIT')
    const updatedEntry = await getJournalEntry(id)
    return updatedEntry!
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Delete a journal entry
 */
export async function deleteJournalEntry(id: number): Promise<void> {
  await pool.query('DELETE FROM journal_entries WHERE id = $1', [id])
}

/**
 * Get aggregated statistics about journal entries
 */
export async function getJournalStats(): Promise<JournalStats> {
  const result = await pool.query(`
    SELECT
      COUNT(*) as total_entries,
      COALESCE(SUM(word_count), 0) as total_words,
      COALESCE(AVG(word_count), 0) as average_word_count,
      json_object_agg(mood, mood_count) as mood_distribution
    FROM (
      SELECT
        je.mood,
        COUNT(*) as mood_count,
        SUM(je.word_count) as word_count
      FROM journal_entries je
      GROUP BY je.mood
    ) mood_stats
  `)

  const stats = result.rows[0]

  // Get entry dates
  const datesResult = await pool.query(
    `SELECT DISTINCT entry_date FROM journal_entries ORDER BY entry_date DESC`
  )
  const entryDates = datesResult.rows.map(row =>
    row.entry_date instanceof Date
      ? row.entry_date.toISOString().split('T')[0]
      : row.entry_date
  )

  // Get top tags
  const tagsResult = await pool.query(`
    SELECT jt.name, COUNT(jet.entry_id) as count
    FROM journal_tags jt
    LEFT JOIN journal_entry_tags jet ON jt.id = jet.tag_id
    GROUP BY jt.id, jt.name
    ORDER BY count DESC
    LIMIT 10
  `)
  const topTags = tagsResult.rows.map(row => ({ name: row.name, count: row.count }))

  // Calculate mood distribution from tags
  const moodDistribution: Record<Mood, number> = {
    great: 0,
    good: 0,
    okay: 0,
    bad: 0,
    terrible: 0,
  }

  if (stats.mood_distribution) {
    Object.entries(stats.mood_distribution).forEach(([mood, count]) => {
      if (mood && mood in moodDistribution) {
        moodDistribution[mood as Mood] = count as number
      }
    })
  }

  // Calculate average mood (simple weighted average)
  const totalMoods = Object.values(moodDistribution).reduce((a, b) => a + b, 0)
  const moodScores: Record<Mood, number> = {
    great: 5,
    good: 4,
    okay: 3,
    bad: 2,
    terrible: 1,
  }
  const averageMoodScore = totalMoods > 0
    ? Object.entries(moodDistribution).reduce((sum, [mood, count]) => {
        return sum + (moodScores[mood as Mood] * count)
      }, 0) / totalMoods
    : 0

  // Map score back to mood
  const moodLabels: Mood[] = ['terrible', 'bad', 'okay', 'good', 'great']
  const averageMood: Mood = moodLabels[Math.round(averageMoodScore) - 1] || 'okay'

  return {
    totalEntries: parseInt(stats.total_entries, 10),
    totalWords: parseInt(stats.total_words, 10),
    averageWordCount: Math.round(parseFloat(stats.average_word_count) * 10) / 10,
    averageMood,
    entryDates,
    topTags,
    moodDistribution,
  }
}

/**
 * Get calendar data for a specific month (shows which days have entries)
 */
export async function getCalendarData(year: number, month: number): Promise<Array<{ date: string; count: number }>> {
  // Validate month
  if (month < 1 || month > 12) {
    throw new Error('Month must be between 1 and 12')
  }

  const result = await pool.query(
    `SELECT
      entry_date,
      COUNT(*) as count
    FROM journal_entries
    WHERE EXTRACT(YEAR FROM entry_date) = $1
      AND EXTRACT(MONTH FROM entry_date) = $2
    GROUP BY entry_date
    ORDER BY entry_date ASC`,
    [year, month]
  )

  return result.rows.map(row => ({
    date: row.entry_date instanceof Date
      ? row.entry_date.toISOString().split('T')[0]
      : row.entry_date,
    count: row.count,
  }))
}

/**
 * Get all available journal tags
 */
export async function getJournalTags(): Promise<JournalTag[]> {
  const result = await pool.query(
    `SELECT * FROM journal_tags ORDER BY name ASC`
  )

  return result.rows.map(normalizeTag)
}

/**
 * Search for tags by name
 */
export async function searchTags(query: string): Promise<JournalTag[]> {
  const result = await pool.query(
    `SELECT * FROM journal_tags
     WHERE name ILIKE $1
     ORDER BY usage_count DESC, name ASC
     LIMIT 20`,
    [`%${query}%`]
  )

  return result.rows.map(normalizeTag)
}
