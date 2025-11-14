import { Pool } from 'pg'
import { HighlightTag } from '@/types/highlight'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

function normalizeTag(row: any): HighlightTag {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    description: row.description,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    highlightCount: row.highlight_count || 0,
  }
}

export async function getTags(options?: {
  includeEmpty?: boolean
  sortBy?: 'name' | 'count' | 'recent'
}): Promise<HighlightTag[]> {
  let query = `
    SELECT * FROM tags
  `

  if (!options?.includeEmpty) {
    query += ` WHERE highlight_count > 0`
  }

  // Sorting
  switch (options?.sortBy) {
    case 'count':
      query += ` ORDER BY highlight_count DESC, name ASC`
      break
    case 'recent':
      query += ` ORDER BY updated_at DESC`
      break
    case 'name':
    default:
      query += ` ORDER BY name ASC`
      break
  }

  const result = await pool.query(query)
  return result.rows.map(normalizeTag)
}

export async function getTagById(id: number): Promise<HighlightTag | null> {
  const result = await pool.query(
    'SELECT * FROM tags WHERE id = $1',
    [id]
  )

  return result.rows.length > 0 ? normalizeTag(result.rows[0]) : null
}

export async function getTagByName(name: string): Promise<HighlightTag | null> {
  const result = await pool.query(
    'SELECT * FROM tags WHERE name = $1',
    [name]
  )

  return result.rows.length > 0 ? normalizeTag(result.rows[0]) : null
}

export interface CreateTagDTO {
  name: string
  color?: string
  description?: string
}

export async function createTag(tag: CreateTagDTO): Promise<HighlightTag> {
  // Check if tag already exists
  const existing = await getTagByName(tag.name)
  if (existing) {
    throw new Error(`Tag "${tag.name}" already exists`)
  }

  const result = await pool.query(
    `INSERT INTO tags (name, color, description, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     RETURNING *`,
    [tag.name, tag.color || null, tag.description || null]
  )

  return normalizeTag(result.rows[0])
}

export interface UpdateTagDTO {
  name?: string
  color?: string
  description?: string
}

export async function updateTag(id: number, updates: UpdateTagDTO): Promise<void> {
  const fields: string[] = []
  const params: any[] = []
  let paramIndex = 1

  if (updates.name !== undefined) {
    // Check for name conflicts
    const existing = await getTagByName(updates.name)
    if (existing && existing.id !== id) {
      throw new Error(`Tag "${updates.name}" already exists`)
    }
    fields.push(`name = $${paramIndex}`)
    params.push(updates.name)
    paramIndex++
  }

  if (updates.color !== undefined) {
    fields.push(`color = $${paramIndex}`)
    params.push(updates.color)
    paramIndex++
  }

  if (updates.description !== undefined) {
    fields.push(`description = $${paramIndex}`)
    params.push(updates.description)
    paramIndex++
  }

  if (fields.length > 0) {
    fields.push('updated_at = NOW()')
    params.push(id)

    const query = `UPDATE tags SET ${fields.join(', ')} WHERE id = $${paramIndex}`
    await pool.query(query, params)
  }
}

export async function deleteTag(id: number): Promise<void> {
  // The CASCADE will handle removing entries from highlight_tags
  await pool.query('DELETE FROM tags WHERE id = $1', [id])
}

export async function mergeTags(sourceTagId: number, targetTagId: number): Promise<void> {
  if (sourceTagId === targetTagId) {
    throw new Error('Cannot merge a tag with itself')
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Get all highlights with the source tag
    const result = await client.query(
      'SELECT highlight_id FROM highlight_tags WHERE tag_id = $1',
      [sourceTagId]
    )

    // Add target tag to all those highlights (if not already present)
    for (const row of result.rows) {
      await client.query(
        `INSERT INTO highlight_tags (highlight_id, tag_id, created_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (highlight_id, tag_id) DO NOTHING`,
        [row.highlight_id, targetTagId]
      )
    }

    // Delete the source tag (CASCADE will remove highlight_tags entries)
    await client.query('DELETE FROM tags WHERE id = $1', [sourceTagId])

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function getTagStats(): Promise<{
  totalTags: number
  totalTaggedHighlights: number
  topTags: Array<{ name: string; count: number; color?: string }>
}> {
  const statsQuery = await pool.query(`
    SELECT
      COUNT(*) as total_tags,
      SUM(highlight_count) as total_tagged_highlights
    FROM tags
  `)

  const topTagsQuery = await pool.query(`
    SELECT name, highlight_count as count, color
    FROM tags
    WHERE highlight_count > 0
    ORDER BY highlight_count DESC
    LIMIT 10
  `)

  return {
    totalTags: parseInt(statsQuery.rows[0].total_tags) || 0,
    totalTaggedHighlights: parseInt(statsQuery.rows[0].total_tagged_highlights) || 0,
    topTags: topTagsQuery.rows.map(row => ({
      name: row.name,
      count: parseInt(row.count),
      color: row.color,
    })),
  }
}
