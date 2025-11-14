import { Pool } from 'pg'
import { Highlight, CreateHighlightDTO, UpdateHighlightDTO, SearchFilters } from '@/types/highlight'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

function normalizeHighlight(row: any): Highlight {
  return {
    id: row.id,
    sourceId: row.source_id,
    text: row.text,
    note: row.note,
    locationType: row.location_type,
    locationValue: row.location_value,
    locationStart: row.location_start,
    locationEnd: row.location_end,
    location: row.location || undefined,
    color: row.color || 'yellow',
    isFavorite: row.is_favorite || false,
    isArchived: row.is_archived || false,
    highlightedAt: row.highlighted_at.toISOString(),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    sourceTitle: row.source_title,
    sourceAuthor: row.source_author,
    sourceType: row.source_type,
    source: row.source_title ? {
      id: row.source_id,
      sourceType: row.source_type,
      title: row.source_title,
      author: row.source_author,
      url: row.source_url,
      bookId: row.book_id,
      createdAt: '',
      updatedAt: '',
    } : undefined,
    tags: (() => {
      try {
        return row.tags && row.tags !== '' ? JSON.parse(row.tags) : []
      } catch {
        return []
      }
    })(),
  }
}

export async function getHighlights(filters?: SearchFilters & {
  limit?: number
  offset?: number
  highlightIds?: number[]
  sourceIds?: number[]
  tags?: string[]
}): Promise<Highlight[]> {
  let query = `
    SELECT
      h.*,
      s.title as source_title,
      s.author as source_author,
      s.source_type,
      s.url as source_url,
      NULL as book_id,
      COALESCE(
        json_agg(
          json_build_object('id', ht.id, 'name', ht.name, 'color', ht.color)
        ) FILTER (WHERE ht.id IS NOT NULL),
        '[]'
      ) as tags
    FROM highlights h
    LEFT JOIN sources s ON h.source_id = s.id
    LEFT JOIN highlight_tags htm ON h.id = htm.highlight_id
    LEFT JOIN tags ht ON htm.tag_id = ht.id
    WHERE 1=1
  `
  const params: any[] = []
  let paramIndex = 1

  if (filters?.query) {
    query += ` AND h.search_vector @@ plainto_tsquery('english', $${paramIndex})`
    params.push(filters.query)
    paramIndex++
  }

  if (filters?.sourceId) {
    query += ` AND h.source_id = $${paramIndex}`
    params.push(filters.sourceId)
    paramIndex++
  }

  if (filters?.sourceIds && filters.sourceIds.length > 0) {
    query += ` AND h.source_id = ANY($${paramIndex})`
    params.push(filters.sourceIds)
    paramIndex++
  }

  if (filters?.highlightIds && filters.highlightIds.length > 0) {
    query += ` AND h.id = ANY($${paramIndex})`
    params.push(filters.highlightIds)
    paramIndex++
  }

  if (filters?.sourceType) {
    query += ` AND s.source_type = $${paramIndex}`
    params.push(filters.sourceType)
    paramIndex++
  }

  if (filters?.hasNotes !== undefined) {
    if (filters.hasNotes) {
      query += ` AND h.note IS NOT NULL AND h.note != ''`
    } else {
      query += ` AND (h.note IS NULL OR h.note = '')`
    }
  }

  if (filters?.startDate) {
    query += ` AND h.highlighted_at >= $${paramIndex}`
    params.push(filters.startDate)
    paramIndex++
  }

  if (filters?.endDate) {
    query += ` AND h.highlighted_at <= $${paramIndex}`
    params.push(filters.endDate)
    paramIndex++
  }

  if (filters?.tagIds && filters.tagIds.length > 0) {
    query += ` AND h.id IN (
      SELECT highlight_id FROM highlight_tags
      WHERE tag_id = ANY($${paramIndex})
    )`
    params.push(filters.tagIds)
    paramIndex++
  }

  if (filters?.tags && filters.tags.length > 0) {
    query += ` AND h.id IN (
      SELECT htm.highlight_id FROM highlight_tags htm
      JOIN tags t ON htm.tag_id = t.id
      WHERE t.name = ANY($${paramIndex})
    )`
    params.push(filters.tags)
    paramIndex++
  }

  query += `
    GROUP BY h.id, s.id
    ORDER BY h.highlighted_at DESC
  `

  if (filters?.limit) {
    query += ` LIMIT $${paramIndex}`
    params.push(filters.limit)
    paramIndex++
  }

  if (filters?.offset) {
    query += ` OFFSET $${paramIndex}`
    params.push(filters.offset)
  }

  const result = await pool.query(query, params)
  return result.rows.map(normalizeHighlight)
}

export async function getHighlightById(id: number): Promise<Highlight | null> {
  const result = await pool.query(
    `SELECT
      h.*,
      s.title as source_title,
      s.author as source_author,
      s.source_type,
      s.url as source_url,
      NULL as book_id,
      COALESCE(
        json_agg(
          json_build_object('id', ht.id, 'name', ht.name, 'color', ht.color)
        ) FILTER (WHERE ht.id IS NOT NULL),
        '[]'
      ) as tags
    FROM highlights h
    LEFT JOIN sources s ON h.source_id = s.id
    LEFT JOIN highlight_tags htm ON h.id = htm.highlight_id
    LEFT JOIN tags ht ON htm.tag_id = ht.id
    WHERE h.id = $1
    GROUP BY h.id, s.id`,
    [id]
  )

  return result.rows.length > 0 ? normalizeHighlight(result.rows[0]) : null
}

export async function createHighlight(highlight: CreateHighlightDTO): Promise<Highlight> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const result = await client.query(
      `INSERT INTO highlights (
        source_id, text, note, location_type, location_value,
        location_start, location_end, color, highlighted_at,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *`,
      [
        highlight.sourceId,
        highlight.text,
        highlight.note || null,
        highlight.locationType || null,
        highlight.locationValue || null,
        highlight.locationStart || null,
        highlight.locationEnd || null,
        highlight.color || 'yellow',
        highlight.highlightedAt || new Date().toISOString(),
      ]
    )

    const highlightId = result.rows[0].id

    // Update source's last_highlighted_at
    await client.query(
      'UPDATE sources SET last_highlighted_at = NOW() WHERE id = $1',
      [highlight.sourceId]
    )

    // Create review card for spaced repetition
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
      )
      VALUES ($1, 2.5, 0, 0, CURRENT_DATE + 1, TRUE, NOW(), NOW())
      ON CONFLICT (highlight_id) DO NOTHING`,
      [highlightId]
    )

    // Enable review flag on highlight
    await client.query(
      `UPDATE highlights SET review_enabled = TRUE WHERE id = $1`,
      [highlightId]
    )

    await client.query('COMMIT')

    return normalizeHighlight(result.rows[0])
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// New function for Kindle import that uses JSONB location field
export interface CreateHighlightWithLocationDTO {
  sourceId: number
  text: string
  note?: string | null
  location?: Record<string, any> | null
  color?: string
  highlightedAt?: string
}

export async function createHighlightWithLocation(
  highlight: CreateHighlightWithLocationDTO
): Promise<Highlight> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const result = await client.query(
      `INSERT INTO highlights (
        source_id, text, note, location, color, highlighted_at,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *`,
      [
        highlight.sourceId,
        highlight.text,
        highlight.note || null,
        highlight.location ? JSON.stringify(highlight.location) : '{}',
        highlight.color || 'yellow',
        highlight.highlightedAt || new Date().toISOString(),
      ]
    )

    const highlightId = result.rows[0].id

    // Update source's last_highlighted_at
    await client.query(
      'UPDATE sources SET last_highlighted_at = NOW() WHERE id = $1',
      [highlight.sourceId]
    )

    await client.query('COMMIT')

    return normalizeHighlight(result.rows[0])
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function updateHighlight(
  id: number,
  updates: UpdateHighlightDTO
): Promise<void> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const fields: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (updates.text !== undefined) {
      fields.push(`text = $${paramIndex}`)
      params.push(updates.text)
      paramIndex++
    }

    if (updates.note !== undefined) {
      fields.push(`note = $${paramIndex}`)
      params.push(updates.note)
      paramIndex++
    }

    if (updates.color !== undefined) {
      fields.push(`color = $${paramIndex}`)
      params.push(updates.color)
      paramIndex++
    }

    if (fields.length > 0) {
      fields.push('updated_at = NOW()')
      params.push(id)

      const query = `UPDATE highlights SET ${fields.join(', ')} WHERE id = $${paramIndex}`
      await client.query(query, params)
    }

    // Update tags if provided
    if (updates.tags !== undefined) {
      // Remove existing tags
      await client.query('DELETE FROM highlight_tags WHERE highlight_id = $1', [id])

      // Add new tags
      if (updates.tags.length > 0) {
        const tagValues = updates.tags.map((_, idx) => `($1, $${idx + 2})`).join(', ')
        const tagParams = [id, ...updates.tags]
        await client.query(
          `INSERT INTO highlight_tags (highlight_id, tag_id)
           VALUES ${tagValues}
           ON CONFLICT DO NOTHING`,
          tagParams
        )
      }
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function deleteHighlight(id: number): Promise<void> {
  await pool.query('DELETE FROM highlights WHERE id = $1', [id])
}

export async function getHighlightsCount(filters?: SearchFilters): Promise<number> {
  let query = `
    SELECT COUNT(DISTINCT h.id) as count
    FROM highlights h
    LEFT JOIN sources s ON h.source_id = s.id
    WHERE 1=1
  `
  const params: any[] = []
  let paramIndex = 1

  if (filters?.query) {
    query += ` AND h.search_vector @@ plainto_tsquery('english', $${paramIndex})`
    params.push(filters.query)
    paramIndex++
  }

  if (filters?.sourceId) {
    query += ` AND h.source_id = $${paramIndex}`
    params.push(filters.sourceId)
    paramIndex++
  }

  if (filters?.sourceType) {
    query += ` AND s.source_type = $${paramIndex}`
    params.push(filters.sourceType)
    paramIndex++
  }

  const result = await pool.query(query, params)
  return parseInt(result.rows[0].count)
}
