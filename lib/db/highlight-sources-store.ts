import { Pool } from 'pg'
import { HighlightSource, CreateSourceDTO } from '@/types/highlight'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

function normalizeSource(row: any): HighlightSource {
  return {
    id: row.id,
    sourceType: row.source_type,
    title: row.title,
    author: row.author,
    url: row.url,
    bookId: row.book_id,
    isbn: row.isbn,
    fileUrl: row.file_url,
    fileSizeBytes: row.file_size_bytes ? BigInt(row.file_size_bytes) : null,
    fileMimeType: row.file_mime_type,
    thumbnailUrl: row.thumbnail_url,
    publishedDate: row.published_date,
    domain: row.domain,
    readingProgress: row.reading_progress ? parseFloat(row.reading_progress) : 0,
    totalPages: row.total_pages,
    content: row.content,
    excerpt: row.excerpt,
    category: row.category,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    lastHighlightedAt: row.last_highlighted_at?.toISOString() || null,
    highlightCount: row.highlight_count ? parseInt(row.highlight_count) : undefined,
    fileStoragePath: row.file_storage_path,
    fullContentHtml: row.full_content_html,
    fullContent: row.full_content,
    book: row.book_id && row.book_title ? {
      id: row.book_id,
      title: row.book_title,
      author: row.book_author,
      coverImage: row.book_cover_image,
    } : undefined,
  }
}

export async function getSources(filters?: {
  sourceType?: string
  bookId?: number
  search?: string
  limit?: number
  offset?: number
  sourceIds?: number[]
}): Promise<HighlightSource[]> {
  let query = `
    SELECT
      s.*,
      COUNT(h.id) as highlight_count,
      NULL as book_title,
      NULL as book_author,
      NULL as book_cover_image
    FROM sources s
    LEFT JOIN highlights h ON s.id = h.source_id
    WHERE 1=1
  `
  const params: any[] = []
  let paramIndex = 1

  if (filters?.sourceType) {
    query += ` AND s.source_type = $${paramIndex}`
    params.push(filters.sourceType)
    paramIndex++
  }

  if (filters?.sourceIds && filters.sourceIds.length > 0) {
    query += ` AND s.id = ANY($${paramIndex})`
    params.push(filters.sourceIds)
    paramIndex++
  }

  if (filters?.bookId) {
    // Skip book_id filter since sources table doesn't have it yet
  }

  if (filters?.search) {
    query += ` AND (s.title ILIKE $${paramIndex} OR s.author ILIKE $${paramIndex})`
    params.push(`%${filters.search}%`)
    paramIndex++
  }

  query += `
    GROUP BY s.id
    ORDER BY s.last_highlighted_at DESC NULLS LAST, s.created_at DESC
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
  return result.rows.map(normalizeSource)
}

export async function getSourceById(id: number): Promise<HighlightSource | null> {
  const result = await pool.query(
    `SELECT
      s.*,
      COUNT(h.id) as highlight_count,
      NULL as book_title,
      NULL as book_author,
      NULL as book_cover_image
    FROM sources s
    LEFT JOIN highlights h ON s.id = h.source_id
    WHERE s.id = $1
    GROUP BY s.id`,
    [id]
  )

  return result.rows.length > 0 ? normalizeSource(result.rows[0]) : null
}

export async function createSource(source: CreateSourceDTO): Promise<HighlightSource> {
  const result = await pool.query(
    `INSERT INTO sources (
      source_type, title, author, url, isbn,
      published_date, category, content, excerpt, domain,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
    RETURNING *`,
    [
      source.sourceType,
      source.title,
      source.author || null,
      source.url || null,
      source.isbn || null,
      source.publishedDate || null,
      source.category || null,
      source.content || null,
      source.excerpt || null,
      source.domain || null,
    ]
  )

  return normalizeSource(result.rows[0])
}

export async function updateSource(
  id: number,
  updates: Partial<HighlightSource>
): Promise<void> {
  const fields: string[] = []
  const params: any[] = []
  let paramIndex = 1

  if (updates.title !== undefined) {
    fields.push(`title = $${paramIndex}`)
    params.push(updates.title)
    paramIndex++
  }

  if (updates.author !== undefined) {
    fields.push(`author = $${paramIndex}`)
    params.push(updates.author)
    paramIndex++
  }

  if (updates.readingProgress !== undefined) {
    fields.push(`reading_progress = $${paramIndex}`)
    params.push(updates.readingProgress)
    paramIndex++
  }

  if (updates.category !== undefined) {
    fields.push(`category = $${paramIndex}`)
    params.push(updates.category)
    paramIndex++
  }

  if (fields.length === 0) return

  fields.push('updated_at = NOW()')
  params.push(id)

  const query = `UPDATE sources SET ${fields.join(', ')} WHERE id = $${paramIndex}`
  await pool.query(query, params)
}

export async function deleteSource(id: number): Promise<void> {
  await pool.query('DELETE FROM sources WHERE id = $1', [id])
}
