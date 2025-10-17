import { Pool } from 'pg'
import { TVShow } from '@/types/tvshow'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

// Pagination parameters interface
export interface PaginatedTVShowsParams {
  limit?: number // Default 50, max 100
  cursor?: string // Last TV show ID from previous page
  status?: string // Filter by status (e.g., 'Watching', 'Completed', etc.)
  sortBy?: 'title' | 'watchedEpisodes' | 'totalEpisodes' | 'dateIStarted' | 'created_at'
  sortOrder?: 'asc' | 'desc'
  search?: string
}

// Paginated response interface
export interface PaginatedTVShowsResponse {
  tvshows: TVShow[]
  nextCursor: string | null
  hasMore: boolean
  total: number
}

// Minimal TV show data for grid view
export interface TVShowGridItem {
  id: string
  tmdbId: number
  title: string
  posterImage: string
  network: string
  genres: string[]
  watchedEpisodes: number
  totalEpisodes: number
}

function normalizeTVShow(show: any): TVShow {
  return {
    ...show,
    id: String(show.id),
    tmdbId: Number(show.tmdb_id),
    creators: show.creators || [],
    posterImage: show.poster_image || '',
    backdropImage: show.backdrop_image || '',
    showStartDate: show.show_start_date,
    showEndDate: show.show_end_date,
    dateIStarted: show.date_i_started instanceof Date ? show.date_i_started.toISOString().split('T')[0] : show.date_i_started,
    dateIEnded: show.date_i_ended instanceof Date ? show.date_i_ended.toISOString().split('T')[0] : show.date_i_ended,
    totalEpisodes: Number(show.total_episodes || 0),
    watchedEpisodes: Number(show.watched_episodes || 0),
    totalMinutes: Number(show.total_minutes || 0),
    daysTracking: Number(show.days_tracking || 0),
    rewatchCount: Number(show.rewatch_count) || 0,
    rewatchHistory: show.rewatch_history || [],
    seasons: show.seasons || [],
    genres: show.genres || [],
    network: show.network || '',
    notes: show.notes || '',
    createdAt: show.created_at,
    updatedAt: show.updated_at,
  }
}

function normalizeTVShowGridItem(show: any): TVShowGridItem {
  return {
    id: String(show.id),
    tmdbId: Number(show.tmdb_id),
    title: show.title,
    posterImage: show.poster_image || '',
    network: show.network || '',
    genres: show.genres || [],
    watchedEpisodes: Number(show.watched_episodes || 0),
    totalEpisodes: Number(show.total_episodes || 0),
  }
}

/**
 * Get paginated TV shows optimized for grid view
 * Returns only essential fields for better performance
 */
export async function getTVShowsGrid(
  params: PaginatedTVShowsParams = {}
): Promise<PaginatedTVShowsResponse> {
  const {
    limit = 50,
    cursor,
    status,
    sortBy = 'created_at',
    sortOrder = 'desc',
    search,
  } = params

  // Validate and sanitize inputs
  const safeLimit = Math.min(Math.max(1, limit), 100)
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC'

  // Map sortBy to actual column names
  const sortColumnMap: Record<string, string> = {
    title: 'title',
    watchedEpisodes: 'watched_episodes',
    totalEpisodes: 'total_episodes',
    dateIStarted: 'date_i_started',
    created_at: 'created_at',
  }
  const sortColumn = sortColumnMap[sortBy] || 'created_at'

  // Build query - only select fields needed for grid display
  let query = `
    SELECT
      id,
      tmdb_id,
      title,
      poster_image,
      network,
      genres,
      watched_episodes,
      total_episodes
    FROM tvshows
    WHERE 1=1
  `
  const queryParams: any[] = []
  let paramIndex = 1

  // Cursor pagination
  if (cursor) {
    const cursorData = await pool.query(
      `SELECT ${sortColumn}, id FROM tvshows WHERE id = $1`,
      [cursor]
    )
    if (cursorData.rows.length > 0) {
      const cursorValue = cursorData.rows[0][sortColumn]
      if (safeSortOrder === 'DESC') {
        query += ` AND (${sortColumn} < $${paramIndex} OR (${sortColumn} = $${paramIndex} AND id < $${paramIndex + 1}))`
      } else {
        query += ` AND (${sortColumn} > $${paramIndex} OR (${sortColumn} = $${paramIndex} AND id > $${paramIndex + 1}))`
      }
      queryParams.push(cursorValue, cursor)
      paramIndex += 2
    }
  }

  // Status filter
  if (status && status !== 'All') {
    query += ` AND status = $${paramIndex}`
    queryParams.push(status)
    paramIndex++
  }

  // Search filter
  if (search && search.trim()) {
    query += ` AND title ILIKE $${paramIndex}`
    queryParams.push(`%${search.trim()}%`)
    paramIndex++
  }

  // Sorting
  query += ` ORDER BY ${sortColumn} ${safeSortOrder}, id ${safeSortOrder}`

  // Limit
  query += ` LIMIT $${paramIndex}`
  queryParams.push(safeLimit + 1)

  // Execute query
  const result = await pool.query(query, queryParams)
  const tvshows = result.rows.map(normalizeTVShowGridItem)

  // Check pagination
  const hasMore = tvshows.length > safeLimit
  if (hasMore) tvshows.pop()

  const nextCursor = hasMore && tvshows.length > 0 ? tvshows[tvshows.length - 1].id : null

  // Get total count
  let countQuery = 'SELECT COUNT(*) FROM tvshows WHERE 1=1'
  const countParams: any[] = []
  let countParamIndex = 1

  if (status && status !== 'All') {
    countQuery += ` AND status = $${countParamIndex}`
    countParams.push(status)
    countParamIndex++
  }

  if (search && search.trim()) {
    countQuery += ` AND title ILIKE $${countParamIndex}`
    countParams.push(`%${search.trim()}%`)
  }

  const countResult = await pool.query(countQuery, countParams)
  const total = parseInt(countResult.rows[0].count)

  return {
    tvshows: tvshows as any, // Cast since TVShowGridItem is subset of TVShow
    nextCursor,
    hasMore,
    total,
  }
}

/**
 * Get a single TV show by ID with all details
 * Returns null if TV show not found
 */
export async function getTVShowById(id: string): Promise<TVShow | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM tvshows WHERE id = $1',
      [id]
    )

    if (result.rows.length === 0) {
      return null
    }

    return normalizeTVShow(result.rows[0])
  } catch (error) {
    console.error('Error fetching TV show by ID:', error)
    throw new Error('Failed to fetch TV show details')
  }
}

/**
 * Get cached statistics (for dashboard)
 * Consider implementing Redis cache in production
 */
export async function getTVShowsStats() {
  const result = await pool.query(`
    SELECT
      COUNT(*) as total,
      SUM(watched_episodes) as total_watched_episodes,
      SUM(total_minutes) as total_minutes,
      COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM date_i_started) = EXTRACT(YEAR FROM CURRENT_DATE)) as this_year
    FROM tvshows
  `)

  const row = result.rows[0]

  return {
    totalShows: parseInt(row.total),
    totalWatchedEpisodes: parseInt(row.total_watched_episodes || 0),
    totalMinutes: parseInt(row.total_minutes || 0),
    showsThisYear: parseInt(row.this_year),
  }
}
