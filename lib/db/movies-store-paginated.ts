import { Pool } from 'pg'
import { Movie } from '@/types/movie'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

// Pagination parameters interface
export interface PaginatedMoviesParams {
  limit?: number // Default 50, max 100
  cursor?: string // Last movie ID from previous page
  status?: 'Watched' | 'Watchlist' | 'All'
  sortBy?: 'title' | 'runtime' | 'rating' | 'dateWatched' | 'releaseDate' | 'created_at'
  sortOrder?: 'asc' | 'desc'
  search?: string
}

// Paginated response interface
export interface PaginatedMoviesResponse {
  movies: Movie[]
  nextCursor: string | null
  hasMore: boolean
  total: number
}

// Minimal movie data for grid view
export interface MovieGridItem {
  id: string
  title: string
  posterImage: string
  status: 'Watched' | 'Watchlist'
  rating: number | null
  runtime: number
  releaseYear: number | null
  releaseDate: string | null
}

function normalizeMovie(movie: any): Movie {
  // Parse genre string into array (database has comma-separated string)
  const genres = movie.genre
    ? movie.genre.split(',').map((g: string) => g.trim()).filter(Boolean)
    : []

  // Format dates consistently
  const formatDate = (date: any) => {
    if (!date) return null
    if (date instanceof Date) return date.toISOString().split('T')[0]
    if (typeof date === 'string') return date.split('T')[0]
    return null
  }

  return {
    ...movie,
    tmdbId: Number(movie.tmdb_id),
    director: movie.director || 'Unknown',
    genres,
    runtime: Number(movie.runtime) || 0,
    releaseDate: formatDate(movie.release_date),
    releaseYear: movie.release_year ? Number(movie.release_year) : null,
    posterImage: movie.poster_image || '',
    status: movie.status || 'Watchlist',
    dateWatched: formatDate(movie.watched_date),
    watchlistAddedDate: formatDate(movie.watchlist_added_date),
    rating: movie.rating ? Number(movie.rating) : null,
    notes: movie.notes || '',
    createdAt: movie.created_at,
    updatedAt: movie.updated_at,
  }
}

function normalizeMovieGridItem(movie: any): MovieGridItem {
  const formatDate = (date: any) => {
    if (!date) return null
    if (date instanceof Date) return date.toISOString().split('T')[0]
    if (typeof date === 'string') return date.split('T')[0]
    return null
  }

  return {
    id: movie.id,
    title: movie.title,
    posterImage: movie.poster_image || '',
    status: movie.status || 'Watchlist',
    rating: movie.rating ? Number(movie.rating) : null,
    runtime: Number(movie.runtime) || 0,
    releaseYear: movie.release_year ? Number(movie.release_year) : null,
    releaseDate: formatDate(movie.release_date),
  }
}

/**
 * Get paginated movies with full data
 * Uses cursor-based pagination for consistent results
 */
export async function getMoviesPaginated(
  params: PaginatedMoviesParams = {}
): Promise<PaginatedMoviesResponse> {
  const {
    limit = 50,
    cursor,
    status = 'All',
    sortBy = 'created_at',
    sortOrder = 'desc',
    search,
  } = params

  // Validate and sanitize inputs
  const safeLimit = Math.min(Math.max(1, limit), 100) // Between 1 and 100
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC'

  // Map sortBy to actual column names
  const sortColumnMap: Record<string, string> = {
    title: 'title',
    runtime: 'runtime',
    rating: 'rating',
    dateWatched: 'watched_date',
    releaseDate: 'release_date',
    created_at: 'created_at',
  }
  const sortColumn = sortColumnMap[sortBy] || 'created_at'

  // Build dynamic query
  let query = 'SELECT * FROM movies WHERE 1=1'
  const queryParams: any[] = []
  let paramIndex = 1

  // Cursor pagination (id-based)
  if (cursor) {
    // For cursor-based pagination, we need to compare based on the sort column
    // and use id as tiebreaker
    const cursorData = await pool.query(
      `SELECT ${sortColumn}, id FROM movies WHERE id = $1`,
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
  if (status !== 'All') {
    query += ` AND status = $${paramIndex}`
    queryParams.push(status)
    paramIndex++
  }

  // Search filter (case-insensitive)
  if (search && search.trim()) {
    query += ` AND title ILIKE $${paramIndex}`
    queryParams.push(`%${search.trim()}%`)
    paramIndex++
  }

  // Sorting
  query += ` ORDER BY ${sortColumn} ${safeSortOrder}, id ${safeSortOrder}`

  // Limit + 1 to check if there are more results
  query += ` LIMIT $${paramIndex}`
  queryParams.push(safeLimit + 1)

  // Execute query
  const result = await pool.query(query, queryParams)
  const movies = result.rows.map(normalizeMovie)

  // Check if there are more results
  const hasMore = movies.length > safeLimit
  if (hasMore) movies.pop() // Remove the extra record

  // Next cursor is the ID of the last item
  const nextCursor = hasMore && movies.length > 0 ? movies[movies.length - 1].id : null

  // Get total count (for UI purposes)
  let countQuery = 'SELECT COUNT(*) FROM movies WHERE 1=1'
  const countParams: any[] = []
  let countParamIndex = 1

  if (status !== 'All') {
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
    movies,
    nextCursor,
    hasMore,
    total,
  }
}

/**
 * Get paginated movies optimized for grid view
 * Returns only essential fields for better performance
 */
export async function getMoviesForGrid(
  params: PaginatedMoviesParams = {}
): Promise<PaginatedMoviesResponse> {
  const {
    limit = 50,
    cursor,
    status = 'All',
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
    runtime: 'runtime',
    rating: 'rating',
    dateWatched: 'watched_date',
    releaseDate: 'release_date',
    created_at: 'created_at',
  }
  const sortColumn = sortColumnMap[sortBy] || 'created_at'

  // Build query - only select fields needed for grid display
  let query = `
    SELECT
      id,
      title,
      poster_image,
      status,
      rating,
      runtime,
      release_year,
      release_date
    FROM movies
    WHERE 1=1
  `
  const queryParams: any[] = []
  let paramIndex = 1

  // Cursor pagination
  if (cursor) {
    const cursorData = await pool.query(
      `SELECT ${sortColumn}, id FROM movies WHERE id = $1`,
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
  if (status !== 'All') {
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
  const movies = result.rows.map(normalizeMovieGridItem)

  // Check pagination
  const hasMore = movies.length > safeLimit
  if (hasMore) movies.pop()

  const nextCursor = hasMore && movies.length > 0 ? movies[movies.length - 1].id : null

  // Get total count
  let countQuery = 'SELECT COUNT(*) FROM movies WHERE 1=1'
  const countParams: any[] = []
  let countParamIndex = 1

  if (status !== 'All') {
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
    movies: movies as any, // Cast since MovieGridItem is subset of Movie
    nextCursor,
    hasMore,
    total,
  }
}

/**
 * Get cached statistics (for dashboard)
 * Consider implementing Redis cache in production
 */
export async function getMoviesStats() {
  const result = await pool.query(`
    SELECT
      COUNT(*) as total,
      SUM(runtime) as total_runtime,
      AVG(rating) FILTER (WHERE rating IS NOT NULL) as avg_rating,
      COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM watched_date) = EXTRACT(YEAR FROM CURRENT_DATE)) as this_year
    FROM movies
  `)

  const row = result.rows[0]

  return {
    totalMovies: parseInt(row.total),
    totalRuntime: parseInt(row.total_runtime || 0),
    avgRating: row.avg_rating ? Math.round(parseFloat(row.avg_rating) * 10) / 10 : 0,
    moviesThisYear: parseInt(row.this_year),
  }
}

/**
 * Get a single movie by ID with all details
 * Returns null if movie not found
 */
export async function getMovieById(id: string): Promise<Movie | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM movies WHERE id = $1',
      [id]
    )

    if (result.rows.length === 0) {
      return null
    }

    return normalizeMovie(result.rows[0])
  } catch (error) {
    console.error('Error fetching movie by ID:', error)
    throw new Error('Failed to fetch movie details')
  }
}
