import { Pool } from 'pg'
import { Highlight } from '@/types/highlight'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

export interface Collection {
  id: number
  name: string
  description?: string | null
  isPublic: boolean
  color?: string | null
  icon?: string | null
  sortOrder: number
  highlightCount: number
  createdAt: string
  updatedAt: string
}

function normalizeCollection(row: any): Collection {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isPublic: row.is_public,
    color: row.color,
    icon: row.icon,
    sortOrder: row.sort_order,
    highlightCount: row.highlight_count || 0,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export async function getCollections(options?: {
  includeEmpty?: boolean
  sortBy?: 'name' | 'count' | 'recent' | 'order'
}): Promise<Collection[]> {
  let query = `
    SELECT * FROM collections
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
    case 'order':
      query += ` ORDER BY sort_order ASC, created_at DESC`
      break
    case 'name':
    default:
      query += ` ORDER BY name ASC`
      break
  }

  const result = await pool.query(query)
  return result.rows.map(normalizeCollection)
}

export async function getCollectionById(id: number): Promise<Collection | null> {
  const result = await pool.query(
    'SELECT * FROM collections WHERE id = $1',
    [id]
  )

  return result.rows.length > 0 ? normalizeCollection(result.rows[0]) : null
}

export interface CreateCollectionDTO {
  name: string
  description?: string
  isPublic?: boolean
  color?: string
  icon?: string
  sortOrder?: number
}

export async function createCollection(collection: CreateCollectionDTO): Promise<Collection> {
  const result = await pool.query(
    `INSERT INTO collections (
      name, description, is_public, color, icon, sort_order,
      created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    RETURNING *`,
    [
      collection.name,
      collection.description || null,
      collection.isPublic || false,
      collection.color || null,
      collection.icon || null,
      collection.sortOrder || 0,
    ]
  )

  return normalizeCollection(result.rows[0])
}

export interface UpdateCollectionDTO {
  name?: string
  description?: string
  isPublic?: boolean
  color?: string
  icon?: string
  sortOrder?: number
}

export async function updateCollection(
  id: number,
  updates: UpdateCollectionDTO
): Promise<void> {
  const fields: string[] = []
  const params: any[] = []
  let paramIndex = 1

  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex}`)
    params.push(updates.name)
    paramIndex++
  }

  if (updates.description !== undefined) {
    fields.push(`description = $${paramIndex}`)
    params.push(updates.description)
    paramIndex++
  }

  if (updates.isPublic !== undefined) {
    fields.push(`is_public = $${paramIndex}`)
    params.push(updates.isPublic)
    paramIndex++
  }

  if (updates.color !== undefined) {
    fields.push(`color = $${paramIndex}`)
    params.push(updates.color)
    paramIndex++
  }

  if (updates.icon !== undefined) {
    fields.push(`icon = $${paramIndex}`)
    params.push(updates.icon)
    paramIndex++
  }

  if (updates.sortOrder !== undefined) {
    fields.push(`sort_order = $${paramIndex}`)
    params.push(updates.sortOrder)
    paramIndex++
  }

  if (fields.length > 0) {
    fields.push('updated_at = NOW()')
    params.push(id)

    const query = `UPDATE collections SET ${fields.join(', ')} WHERE id = $${paramIndex}`
    await pool.query(query, params)
  }
}

export async function deleteCollection(id: number): Promise<void> {
  // The CASCADE will handle removing entries from collection_highlights
  await pool.query('DELETE FROM collections WHERE id = $1', [id])
}

export async function addHighlightToCollection(
  collectionId: number,
  highlightId: number,
  options?: {
    position?: number
    collectionNote?: string
  }
): Promise<void> {
  await pool.query(
    `INSERT INTO collection_highlights (
      collection_id, highlight_id, position, collection_note, created_at
    )
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (collection_id, highlight_id)
    DO UPDATE SET
      position = COALESCE($3, collection_highlights.position),
      collection_note = COALESCE($4, collection_highlights.collection_note)`,
    [
      collectionId,
      highlightId,
      options?.position || 0,
      options?.collectionNote || null,
    ]
  )
}

export async function removeHighlightFromCollection(
  collectionId: number,
  highlightId: number
): Promise<void> {
  await pool.query(
    'DELETE FROM collection_highlights WHERE collection_id = $1 AND highlight_id = $2',
    [collectionId, highlightId]
  )
}

export async function getCollectionHighlights(
  collectionId: number,
  options?: {
    limit?: number
    offset?: number
  }
): Promise<Array<Highlight & { collectionNote?: string; position: number }>> {
  const query = `
    SELECT
      h.*,
      s.title as source_title,
      s.author as source_author,
      s.source_type,
      s.url as source_url,
      ch.collection_note,
      ch.position,
      COALESCE(
        json_agg(
          json_build_object('id', ht.id, 'name', ht.name, 'color', ht.color)
        ) FILTER (WHERE ht.id IS NOT NULL),
        '[]'
      ) as tags
    FROM collection_highlights ch
    JOIN highlights h ON ch.highlight_id = h.id
    LEFT JOIN sources s ON h.source_id = s.id
    LEFT JOIN highlight_tags htm ON h.id = htm.highlight_id
    LEFT JOIN tags ht ON htm.tag_id = ht.id
    WHERE ch.collection_id = $1
    GROUP BY h.id, s.id, ch.collection_note, ch.position
    ORDER BY ch.position ASC, h.highlighted_at DESC
  `

  const params: any[] = [collectionId]

  if (options?.limit) {
    params.push(options.limit)
  }
  if (options?.offset) {
    params.push(options.offset)
  }

  const result = await pool.query(query, params)

  return result.rows.map(row => ({
    id: row.id,
    sourceId: row.source_id,
    text: row.text,
    note: row.note,
    locationType: row.location_type,
    locationValue: row.location_value,
    locationStart: row.location_start,
    locationEnd: row.location_end,
    color: row.color || 'yellow',
    highlightedAt: row.highlighted_at.toISOString(),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    source: row.source_title ? {
      id: row.source_id,
      sourceType: row.source_type,
      title: row.source_title,
      author: row.source_author,
      url: row.source_url,
      createdAt: '',
      updatedAt: '',
    } : undefined,
    tags: row.tags ? JSON.parse(row.tags) : [],
    collectionNote: row.collection_note,
    position: row.position,
  }))
}

export async function getHighlightCollections(
  highlightId: number
): Promise<Collection[]> {
  const result = await pool.query(
    `SELECT c.*
     FROM collections c
     JOIN collection_highlights ch ON c.id = ch.collection_id
     WHERE ch.highlight_id = $1
     ORDER BY c.name ASC`,
    [highlightId]
  )

  return result.rows.map(normalizeCollection)
}

export async function updateHighlightPosition(
  collectionId: number,
  highlightId: number,
  position: number
): Promise<void> {
  await pool.query(
    `UPDATE collection_highlights
     SET position = $3
     WHERE collection_id = $1 AND highlight_id = $2`,
    [collectionId, highlightId, position]
  )
}

export async function getCollectionStats(): Promise<{
  totalCollections: number
  totalHighlightsInCollections: number
  topCollections: Array<{ name: string; count: number; color?: string }>
}> {
  const statsQuery = await pool.query(`
    SELECT
      COUNT(*) as total_collections,
      SUM(highlight_count) as total_highlights
    FROM collections
  `)

  const topCollectionsQuery = await pool.query(`
    SELECT name, highlight_count as count, color
    FROM collections
    WHERE highlight_count > 0
    ORDER BY highlight_count DESC
    LIMIT 10
  `)

  return {
    totalCollections: parseInt(statsQuery.rows[0].total_collections) || 0,
    totalHighlightsInCollections: parseInt(statsQuery.rows[0].total_highlights) || 0,
    topCollections: topCollectionsQuery.rows.map(row => ({
      name: row.name,
      count: parseInt(row.count),
      color: row.color,
    })),
  }
}
