import { Pool } from 'pg'
import { Game } from '@/types/game'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

// Pagination parameters interface
export interface PaginatedGamesParams {
  limit?: number // Default 50, max 100
  cursor?: string // Last game ID from previous page
  status?: 'Playing' | 'Completed' | 'Stopped' | 'All'
  sortBy?: 'title' | 'hoursPlayed' | 'percentage' | 'dateStarted' | 'created_at'
  sortOrder?: 'asc' | 'desc'
  search?: string
}

// Paginated response interface
export interface PaginatedGamesResponse {
  games: Game[]
  nextCursor: string | null
  hasMore: boolean
  total: number
}

// Minimal game data for grid view
export interface GameGridItem {
  id: string
  title: string
  coverImage: string
  status: 'Playing' | 'Completed' | 'Stopped'
  console: string
  hoursPlayed: number
  percentage: number
  rating: number | null
}

function normalizeGame(game: any): Game {
  const hoursPlayed = Number(game.hours_played || 0)
  const minutesPlayed = Number(game.minutes_played || 0)
  const totalHours = hoursPlayed + minutesPlayed / 60
  const price = Number(game.price || 0)
  const pricePerHour = totalHours > 0 && price > 0 ? price / totalHours : 0

  return {
    id: String(game.id),
    title: game.title || '',
    developer: game.developer || '',
    publisher: game.publisher || '',
    genres: game.genres || [],
    releaseDate: game.release_date || '',
    coverImage: game.cover_image || '',
    status: game.status || 'Playing',
    percentage: Number(game.percentage || 0),
    dateStarted: game.started_date instanceof Date ? game.started_date.toISOString().split('T')[0] : game.started_date,
    dateCompleted: game.completed_date instanceof Date ? game.completed_date.toISOString().split('T')[0] : game.completed_date,
    daysPlayed: Number(game.days_played || 0),
    hoursPlayed,
    minutesPlayed,
    console: game.platform || game.console || '',
    store: game.store || '',
    price,
    pricePerHour,
    isGift: Boolean(game.is_gift || false),
    notes: game.notes || '',
    createdAt: game.created_at,
    updatedAt: game.updated_at,
  }
}

function normalizeGameGridItem(game: any): GameGridItem {
  const hoursPlayed = Number(game.hours_played || 0)
  const minutesPlayed = Number(game.minutes_played || 0)
  const totalHours = hoursPlayed + minutesPlayed / 60

  return {
    id: String(game.id),
    title: game.title,
    coverImage: game.cover_image || '',
    status: game.status || 'Playing',
    console: game.platform || game.console || '',
    hoursPlayed: Math.round(totalHours * 10) / 10,
    percentage: Number(game.percentage || 0),
    rating: game.rating ? Number(game.rating) : null,
  }
}

/**
 * Get paginated games optimized for grid view
 * Returns only essential fields for better performance
 */
export async function getGamesGrid(
  params: PaginatedGamesParams = {}
): Promise<PaginatedGamesResponse> {
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
    hoursPlayed: 'hours_played',
    percentage: 'percentage',
    dateStarted: 'started_date',
    created_at: 'created_at',
  }
  const sortColumn = sortColumnMap[sortBy] || 'created_at'

  // Build query - only select fields needed for grid display
  let query = `
    SELECT
      id,
      title,
      cover_image,
      status,
      platform,
      console,
      hours_played,
      minutes_played,
      percentage,
      rating
    FROM games
    WHERE 1=1
  `
  const queryParams: any[] = []
  let paramIndex = 1

  // Cursor pagination
  if (cursor) {
    const cursorData = await pool.query(
      `SELECT ${sortColumn}, id FROM games WHERE id = $1`,
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
  const games = result.rows.map(normalizeGameGridItem)

  // Check pagination
  const hasMore = games.length > safeLimit
  if (hasMore) games.pop()

  const nextCursor = hasMore && games.length > 0 ? games[games.length - 1].id : null

  // Get total count
  let countQuery = 'SELECT COUNT(*) FROM games WHERE 1=1'
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
    games: games as any, // Cast since GameGridItem is subset of Game
    nextCursor,
    hasMore,
    total,
  }
}

/**
 * Get a single game by ID with all details
 * Returns null if game not found
 */
export async function getGameById(id: string): Promise<Game | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM games WHERE id = $1',
      [id]
    )

    if (result.rows.length === 0) {
      return null
    }

    return normalizeGame(result.rows[0])
  } catch (error) {
    console.error('Error fetching game by ID:', error)
    throw new Error('Failed to fetch game details')
  }
}

/**
 * Get cached statistics (for dashboard)
 * Consider implementing Redis cache in production
 */
export async function getGamesStats() {
  const result = await pool.query(`
    SELECT
      COUNT(*) as total,
      SUM(hours_played + minutes_played / 60.0) as total_hours,
      AVG(percentage) FILTER (WHERE percentage IS NOT NULL) as avg_percentage,
      COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM started_date) = EXTRACT(YEAR FROM CURRENT_DATE)) as this_year
    FROM games
    WHERE status != 'Stopped'
  `)

  const row = result.rows[0]

  return {
    totalGames: parseInt(row.total),
    totalHours: Math.round(parseFloat(row.total_hours || 0) * 10) / 10,
    avgPercentage: row.avg_percentage ? Math.round(parseFloat(row.avg_percentage)) : 0,
    gamesThisYear: parseInt(row.this_year),
  }
}
