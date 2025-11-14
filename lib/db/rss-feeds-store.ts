import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface RSSFeed {
  id: number
  title: string
  feedUrl: string
  siteUrl: string | null
  description: string | null
  lastFetchedAt: string | null
  fetchIntervalMinutes: number
  isActive: boolean
  lastError: string | null
  consecutiveErrors: number
  createdAt: string
  updatedAt: string
  itemCount?: number
  unimportedCount?: number
}

export interface CreateRSSFeedDTO {
  title: string
  feedUrl: string
  siteUrl?: string
  description?: string
  fetchIntervalMinutes?: number
  isActive?: boolean
}

export interface UpdateRSSFeedDTO {
  title?: string
  siteUrl?: string
  description?: string
  fetchIntervalMinutes?: number
  isActive?: boolean
  lastError?: string | null
  consecutiveErrors?: number
}

export interface RSSFeedItem {
  id: number
  feedId: number
  sourceId: number | null
  title: string
  url: string
  description: string | null
  author: string | null
  publishedAt: string | null
  isImported: boolean
  importedAt: string | null
  createdAt: string
  feedTitle?: string
}

export interface CreateRSSFeedItemDTO {
  feedId: number
  title: string
  url: string
  description?: string
  author?: string
  publishedAt?: Date
}

// ============================================
// RSS FEEDS CRUD
// ============================================

function normalizeRSSFeed(row: any): RSSFeed {
  return {
    id: row.id,
    title: row.title,
    feedUrl: row.feed_url,
    siteUrl: row.site_url,
    description: row.description,
    lastFetchedAt: row.last_fetched_at?.toISOString() || null,
    fetchIntervalMinutes: row.fetch_interval_minutes,
    isActive: row.is_active,
    lastError: row.last_error,
    consecutiveErrors: row.consecutive_errors,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    itemCount: row.item_count ? parseInt(row.item_count) : undefined,
    unimportedCount: row.unimported_count ? parseInt(row.unimported_count) : undefined,
  }
}

/**
 * Get all RSS feeds with optional filtering
 */
export async function getRSSFeeds(filters?: {
  isActive?: boolean
  limit?: number
  offset?: number
}): Promise<RSSFeed[]> {
  let query = `
    SELECT
      f.*,
      COUNT(i.id) as item_count,
      COUNT(i.id) FILTER (WHERE i.is_imported = FALSE) as unimported_count
    FROM rss_feeds f
    LEFT JOIN rss_feed_items i ON f.id = i.feed_id
    WHERE 1=1
  `

  const params: any[] = []
  let paramIndex = 1

  if (filters?.isActive !== undefined) {
    query += ` AND f.is_active = $${paramIndex}`
    params.push(filters.isActive)
    paramIndex++
  }

  query += `
    GROUP BY f.id
    ORDER BY f.created_at DESC
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
  return result.rows.map(normalizeRSSFeed)
}

/**
 * Get a single RSS feed by ID
 */
export async function getRSSFeedById(id: number): Promise<RSSFeed | null> {
  const result = await pool.query(
    `SELECT
      f.*,
      COUNT(i.id) as item_count,
      COUNT(i.id) FILTER (WHERE i.is_imported = FALSE) as unimported_count
    FROM rss_feeds f
    LEFT JOIN rss_feed_items i ON f.id = i.feed_id
    WHERE f.id = $1
    GROUP BY f.id`,
    [id]
  )

  return result.rows.length > 0 ? normalizeRSSFeed(result.rows[0]) : null
}

/**
 * Get RSS feed by URL (for deduplication)
 */
export async function getRSSFeedByUrl(feedUrl: string): Promise<RSSFeed | null> {
  const result = await pool.query(
    `SELECT
      f.*,
      COUNT(i.id) as item_count,
      COUNT(i.id) FILTER (WHERE i.is_imported = FALSE) as unimported_count
    FROM rss_feeds f
    LEFT JOIN rss_feed_items i ON f.id = i.feed_id
    WHERE f.feed_url = $1
    GROUP BY f.id`,
    [feedUrl]
  )

  return result.rows.length > 0 ? normalizeRSSFeed(result.rows[0]) : null
}

/**
 * Create a new RSS feed
 */
export async function createRSSFeed(feed: CreateRSSFeedDTO): Promise<RSSFeed> {
  const result = await pool.query(
    `INSERT INTO rss_feeds (
      title, feed_url, site_url, description,
      fetch_interval_minutes, is_active,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    RETURNING *`,
    [
      feed.title,
      feed.feedUrl,
      feed.siteUrl || null,
      feed.description || null,
      feed.fetchIntervalMinutes || 60,
      feed.isActive !== undefined ? feed.isActive : true,
    ]
  )

  return normalizeRSSFeed(result.rows[0])
}

/**
 * Update an RSS feed
 */
export async function updateRSSFeed(
  id: number,
  updates: UpdateRSSFeedDTO
): Promise<void> {
  const fields: string[] = []
  const params: any[] = []
  let paramIndex = 1

  if (updates.title !== undefined) {
    fields.push(`title = $${paramIndex}`)
    params.push(updates.title)
    paramIndex++
  }

  if (updates.siteUrl !== undefined) {
    fields.push(`site_url = $${paramIndex}`)
    params.push(updates.siteUrl)
    paramIndex++
  }

  if (updates.description !== undefined) {
    fields.push(`description = $${paramIndex}`)
    params.push(updates.description)
    paramIndex++
  }

  if (updates.fetchIntervalMinutes !== undefined) {
    fields.push(`fetch_interval_minutes = $${paramIndex}`)
    params.push(updates.fetchIntervalMinutes)
    paramIndex++
  }

  if (updates.isActive !== undefined) {
    fields.push(`is_active = $${paramIndex}`)
    params.push(updates.isActive)
    paramIndex++
  }

  if (updates.lastError !== undefined) {
    fields.push(`last_error = $${paramIndex}`)
    params.push(updates.lastError)
    paramIndex++
  }

  if (updates.consecutiveErrors !== undefined) {
    fields.push(`consecutive_errors = $${paramIndex}`)
    params.push(updates.consecutiveErrors)
    paramIndex++
  }

  if (fields.length === 0) return

  fields.push('updated_at = NOW()')
  params.push(id)

  const query = `UPDATE rss_feeds SET ${fields.join(', ')} WHERE id = $${paramIndex}`
  await pool.query(query, params)
}

/**
 * Mark feed as fetched (updates last_fetched_at timestamp)
 */
export async function markRSSFeedAsFetched(id: number, success: boolean): Promise<void> {
  if (success) {
    // Reset error tracking on successful fetch
    await pool.query(
      `UPDATE rss_feeds
       SET last_fetched_at = NOW(),
           last_error = NULL,
           consecutive_errors = 0,
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    )
  } else {
    // Increment error counter
    await pool.query(
      `UPDATE rss_feeds
       SET last_fetched_at = NOW(),
           consecutive_errors = consecutive_errors + 1,
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    )
  }
}

/**
 * Delete an RSS feed (cascades to items)
 */
export async function deleteRSSFeed(id: number): Promise<void> {
  await pool.query('DELETE FROM rss_feeds WHERE id = $1', [id])
}

/**
 * Get feeds that need fetching based on interval
 */
export async function getFeedsToFetch(limit: number = 10): Promise<RSSFeed[]> {
  const result = await pool.query(
    `SELECT
      f.*,
      COUNT(i.id) as item_count,
      COUNT(i.id) FILTER (WHERE i.is_imported = FALSE) as unimported_count
    FROM rss_feeds f
    LEFT JOIN rss_feed_items i ON f.id = i.feed_id
    WHERE f.is_active = TRUE
      AND (
        f.last_fetched_at IS NULL
        OR f.last_fetched_at < NOW() - (f.fetch_interval_minutes || ' minutes')::INTERVAL
      )
      AND f.consecutive_errors < 5  -- Stop fetching after 5 consecutive errors
    GROUP BY f.id
    ORDER BY f.last_fetched_at ASC NULLS FIRST
    LIMIT $1`,
    [limit]
  )

  return result.rows.map(normalizeRSSFeed)
}

// ============================================
// RSS FEED ITEMS CRUD
// ============================================

function normalizeRSSFeedItem(row: any): RSSFeedItem {
  return {
    id: row.id,
    feedId: row.feed_id,
    sourceId: row.source_id,
    title: row.title,
    url: row.url,
    description: row.description,
    author: row.author,
    publishedAt: row.published_at?.toISOString() || null,
    isImported: row.is_imported,
    importedAt: row.imported_at?.toISOString() || null,
    createdAt: row.created_at.toISOString(),
    feedTitle: row.feed_title,
  }
}

/**
 * Get RSS feed items with optional filtering
 */
export async function getRSSFeedItems(filters?: {
  feedId?: number
  isImported?: boolean
  limit?: number
  offset?: number
}): Promise<RSSFeedItem[]> {
  let query = `
    SELECT
      i.*,
      f.title as feed_title
    FROM rss_feed_items i
    JOIN rss_feeds f ON i.feed_id = f.id
    WHERE 1=1
  `

  const params: any[] = []
  let paramIndex = 1

  if (filters?.feedId) {
    query += ` AND i.feed_id = $${paramIndex}`
    params.push(filters.feedId)
    paramIndex++
  }

  if (filters?.isImported !== undefined) {
    query += ` AND i.is_imported = $${paramIndex}`
    params.push(filters.isImported)
    paramIndex++
  }

  query += `
    ORDER BY i.published_at DESC NULLS LAST, i.created_at DESC
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
  return result.rows.map(normalizeRSSFeedItem)
}

/**
 * Get a single RSS feed item by ID
 */
export async function getRSSFeedItemById(id: number): Promise<RSSFeedItem | null> {
  const result = await pool.query(
    `SELECT
      i.*,
      f.title as feed_title
    FROM rss_feed_items i
    JOIN rss_feeds f ON i.feed_id = f.id
    WHERE i.id = $1`,
    [id]
  )

  return result.rows.length > 0 ? normalizeRSSFeedItem(result.rows[0]) : null
}

/**
 * Create RSS feed items in bulk (deduplicates by feed_id + url)
 */
export async function createRSSFeedItems(
  items: CreateRSSFeedItemDTO[]
): Promise<number> {
  if (items.length === 0) return 0

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    let insertedCount = 0

    for (const item of items) {
      const result = await client.query(
        `INSERT INTO rss_feed_items (
          feed_id, title, url, description, author, published_at,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (feed_id, url) DO NOTHING
        RETURNING id`,
        [
          item.feedId,
          item.title,
          item.url,
          item.description || null,
          item.author || null,
          item.publishedAt || null,
        ]
      )

      if (result.rows.length > 0) {
        insertedCount++
      }
    }

    await client.query('COMMIT')
    return insertedCount

  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Mark an RSS feed item as imported
 */
export async function markRSSFeedItemAsImported(
  itemId: number,
  sourceId: number
): Promise<void> {
  await pool.query(
    `UPDATE rss_feed_items
     SET is_imported = TRUE,
         source_id = $1,
         imported_at = NOW()
     WHERE id = $2`,
    [sourceId, itemId]
  )
}

/**
 * Delete an RSS feed item
 */
export async function deleteRSSFeedItem(id: number): Promise<void> {
  await pool.query('DELETE FROM rss_feed_items WHERE id = $1', [id])
}

/**
 * Get count of unimported items for a feed
 */
export async function getUnimportedItemsCount(feedId: number): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*) as count
     FROM rss_feed_items
     WHERE feed_id = $1 AND is_imported = FALSE`,
    [feedId]
  )

  return parseInt(result.rows[0].count)
}
