"use server"

import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

export type TimePeriod = "week" | "month" | "year" | "all"

interface DateRange {
  start: Date
  end: Date
}

function getDateRange(period: TimePeriod): DateRange {
  const end = new Date()
  let start = new Date()

  switch (period) {
    case "week":
      start.setDate(end.getDate() - 7)
      break
    case "month":
      start.setMonth(end.getMonth() - 1)
      break
    case "year":
      start.setFullYear(end.getFullYear() - 1)
      break
    case "all":
      start = new Date(0) // Beginning of time
      break
  }

  return { start, end }
}

// In-memory cache for statistics
// In production, replace with Redis for multi-instance deployments
interface CacheEntry {
  data: any
  timestamp: number
  period: TimePeriod
}

const statsCache = new Map<string, CacheEntry>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCachedStats(period: TimePeriod): any | null {
  const cacheKey = `stats:${period}`
  const cached = statsCache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  return null
}

function setCachedStats(period: TimePeriod, data: any): void {
  const cacheKey = `stats:${period}`
  statsCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    period,
  })
}

// Invalidate cache when data changes (call this from your update actions)
export function invalidateStatsCache(): void {
  statsCache.clear()
}

/**
 * Optimized statistics query using database aggregation
 * All calculations done in SQL for maximum performance
 */
export async function getStatsAction(period: TimePeriod = "month") {
  try {
    // Check cache first
    const cached = getCachedStats(period)
    if (cached) {
      return cached
    }

    const { start, end } = getDateRange(period)
    const startDate = start.toISOString()
    const endDate = end.toISOString()

    // Execute all queries in parallel for maximum performance
    const [
      gamesStats,
      booksStats,
      tvStats,
      moviesStats,
      phevStats,
      inventoryStats,
      jobsStats,
    ] = await Promise.all([
      // Games statistics - single optimized query
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'Completed') as completed,
          COUNT(*) FILTER (WHERE status = 'Playing') as playing,
          COALESCE(SUM(COALESCE(hours_played, 0) + COALESCE(minutes_played, 0) / 60.0), 0) as total_hours,
          COALESCE(AVG(COALESCE(percentage, 0)), 0) as avg_completion,
          COALESCE(SUM(COALESCE(price, 0)), 0) as total_cost
        FROM games
        WHERE ($1 = 'all' OR updated_at >= $2::timestamptz)
      `, [period === 'all' ? 'all' : 'period', startDate]),

      // Books statistics - single optimized query
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'Completed') as completed,
          COUNT(*) FILTER (WHERE status = 'Reading') as reading,
          COALESCE(SUM(COALESCE(pages, 0)), 0) as total_pages,
          COALESCE(SUM(COALESCE(hours, 0) + COALESCE(minutes, 0) / 60.0), 0) as total_hours
        FROM books
        WHERE ($1 = 'all' OR updated_at >= $2::timestamptz)
      `, [period === 'all' ? 'all' : 'period', startDate]),

      // TV Shows statistics - single optimized query
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'Watching') as watching,
          COUNT(*) FILTER (WHERE status = 'Completed') as completed,
          COALESCE(SUM(COALESCE(watched_episodes, 0)), 0) as total_episodes,
          COALESCE(SUM(COALESCE(total_minutes, 0) / 60.0), 0) as total_hours
        FROM tvshows
        WHERE ($1 = 'all' OR updated_at >= $2::timestamptz)
      `, [period === 'all' ? 'all' : 'period', startDate]),

      // Movies statistics - single optimized query
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'Watched') as watched,
          COALESCE(SUM(COALESCE(runtime, 0)), 0) as total_runtime,
          COALESCE(SUM(COALESCE(runtime, 0) / 60.0), 0) as total_hours
        FROM movies
        WHERE ($1 = 'all' OR updated_at >= $2::timestamptz)
      `, [period === 'all' ? 'all' : 'period', startDate]),

      // PHEV statistics - single optimized query
      pool.query(`
        SELECT
          COALESCE(SUM(COALESCE(km_driven, 0)), 0) as total_km,
          COALESCE(SUM(COALESCE(total_cost, 0)), 0) as total_cost,
          COUNT(*) as entries,
          CASE
            WHEN COUNT(*) > 0 THEN COALESCE(SUM(COALESCE(km_driven, 0)), 0) / COUNT(*)
            ELSE 0
          END as avg_km_per_entry
        FROM phev_entries
        WHERE ($1 = 'all' OR date >= $2::date AND date <= $3::date)
      `, [period === 'all' ? 'all' : 'period', start.toISOString().split('T')[0], end.toISOString().split('T')[0]]),

      // Inventory statistics - single optimized query
      pool.query(`
        SELECT
          COUNT(*) as total,
          COALESCE(SUM(COALESCE(purchase_price, 0) * COALESCE(quantity, 1)), 0) as total_value,
          COALESCE(SUM(COALESCE(quantity, 1)), 0) as total_quantity
        FROM inventory_items
      `),

      // Jobs statistics - single optimized query
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'Applied') as applied,
          COUNT(*) FILTER (WHERE status = 'Interview') as interview,
          COUNT(*) FILTER (WHERE status = 'Offer') as offer,
          COUNT(*) FILTER (WHERE status = 'Rejected') as rejected
        FROM jobs
        WHERE ($1 = 'all' OR updated_at >= $2::timestamptz)
      `, [period === 'all' ? 'all' : 'period', startDate]),
    ])

    // Parse results - convert to numbers
    const gamesData = {
      total: Number(gamesStats.rows[0].total),
      completed: Number(gamesStats.rows[0].completed),
      playing: Number(gamesStats.rows[0].playing),
      totalHours: Number(gamesStats.rows[0].total_hours),
      avgCompletion: Number(gamesStats.rows[0].avg_completion),
      totalCost: Number(gamesStats.rows[0].total_cost),
    }

    const booksData = {
      total: Number(booksStats.rows[0].total),
      completed: Number(booksStats.rows[0].completed),
      reading: Number(booksStats.rows[0].reading),
      totalPages: Number(booksStats.rows[0].total_pages),
      totalHours: Number(booksStats.rows[0].total_hours),
    }

    const tvData = {
      total: Number(tvStats.rows[0].total),
      watching: Number(tvStats.rows[0].watching),
      completed: Number(tvStats.rows[0].completed),
      totalEpisodes: Number(tvStats.rows[0].total_episodes),
      totalHours: Number(tvStats.rows[0].total_hours),
    }

    const moviesData = {
      total: Number(moviesStats.rows[0].total),
      watched: Number(moviesStats.rows[0].watched),
      totalRuntime: Number(moviesStats.rows[0].total_runtime),
      totalHours: Number(moviesStats.rows[0].total_hours),
    }

    const phevData = {
      totalKm: Number(phevStats.rows[0].total_km),
      totalCost: Number(phevStats.rows[0].total_cost),
      entries: Number(phevStats.rows[0].entries),
      avgKmPerEntry: Number(phevStats.rows[0].avg_km_per_entry),
    }

    const inventoryData = {
      total: Number(inventoryStats.rows[0].total),
      totalValue: Number(inventoryStats.rows[0].total_value),
      totalQuantity: Number(inventoryStats.rows[0].total_quantity),
    }

    const jobsData = {
      total: Number(jobsStats.rows[0].total),
      applied: Number(jobsStats.rows[0].applied),
      interview: Number(jobsStats.rows[0].interview),
      offer: Number(jobsStats.rows[0].offer),
      rejected: Number(jobsStats.rows[0].rejected),
    }

    // Calculate total time investment
    const totalTimeHours = gamesData.totalHours + booksData.totalHours + tvData.totalHours + moviesData.totalHours

    // Quick stats for header
    const quickStats = {
      totalItems: gamesData.total + booksData.total + tvData.total + moviesData.total,
      totalHours: totalTimeHours,
      activeCategories: [
        gamesData.total > 0,
        booksData.total > 0,
        tvData.total > 0,
        moviesData.total > 0,
        phevData.entries > 0,
        inventoryData.total > 0,
        jobsData.total > 0,
      ].filter(Boolean).length,
    }

    const result = {
      period,
      quickStats,
      games: gamesData,
      books: booksData,
      tvShows: tvData,
      movies: moviesData,
      phev: phevData,
      inventory: inventoryData,
      jobs: jobsData,
      timeInvestment: {
        games: gamesData.totalHours,
        books: booksData.totalHours,
        tvShows: tvData.totalHours,
        movies: moviesData.totalHours,
        total: totalTimeHours,
      },
    }

    // Cache the result
    setCachedStats(period, result)

    return result
  } catch (error) {
    console.error("Error fetching statistics:", error)
    throw error
  }
}

/**
 * Optimized activity timeline using a single query with window functions
 * Instead of 24 separate queries (4 tables × 6 months), we use 1 query per table
 */
export async function getActivityTimelineAction(months: number = 6) {
  try {
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)

    // Single optimized query per table using date_trunc for grouping
    const [gamesData, booksData, tvData, moviesData] = await Promise.all([
      pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', updated_at), 'Mon') as month,
          COUNT(*) as count,
          EXTRACT(YEAR FROM updated_at) as year,
          EXTRACT(MONTH FROM updated_at) as month_num
        FROM games
        WHERE updated_at >= $1
        GROUP BY DATE_TRUNC('month', updated_at)
        ORDER BY DATE_TRUNC('month', updated_at)
      `, [startDate.toISOString()]),

      pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', updated_at), 'Mon') as month,
          COUNT(*) as count,
          EXTRACT(YEAR FROM updated_at) as year,
          EXTRACT(MONTH FROM updated_at) as month_num
        FROM books
        WHERE updated_at >= $1
        GROUP BY DATE_TRUNC('month', updated_at)
        ORDER BY DATE_TRUNC('month', updated_at)
      `, [startDate.toISOString()]),

      pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', updated_at), 'Mon') as month,
          COUNT(*) as count,
          EXTRACT(YEAR FROM updated_at) as year,
          EXTRACT(MONTH FROM updated_at) as month_num
        FROM tvshows
        WHERE updated_at >= $1
        GROUP BY DATE_TRUNC('month', updated_at)
        ORDER BY DATE_TRUNC('month', updated_at)
      `, [startDate.toISOString()]),

      pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', updated_at), 'Mon') as month,
          COUNT(*) as count,
          EXTRACT(YEAR FROM updated_at) as year,
          EXTRACT(MONTH FROM updated_at) as month_num
        FROM movies
        WHERE updated_at >= $1
        GROUP BY DATE_TRUNC('month', updated_at)
        ORDER BY DATE_TRUNC('month', updated_at)
      `, [startDate.toISOString()]),
    ])

    // Create a map for easy lookup
    const gamesMap = new Map(gamesData.rows.map(r => [`${r.year}-${r.month_num}`, Number(r.count)]))
    const booksMap = new Map(booksData.rows.map(r => [`${r.year}-${r.month_num}`, Number(r.count)]))
    const tvMap = new Map(tvData.rows.map(r => [`${r.year}-${r.month_num}`, Number(r.count)]))
    const moviesMap = new Map(moviesData.rows.map(r => [`${r.year}-${r.month_num}`, Number(r.count)]))

    // Build the complete timeline
    const monthsData = []
    for (let i = months - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = monthDate.getFullYear()
      const monthNum = monthDate.getMonth() + 1
      const key = `${year}-${monthNum}`

      monthsData.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
        games: gamesMap.get(key) || 0,
        books: booksMap.get(key) || 0,
        tvShows: tvMap.get(key) || 0,
        movies: moviesMap.get(key) || 0,
      })
    }

    return monthsData
  } catch (error) {
    console.error("Error fetching activity timeline:", error)
    throw error
  }
}

/**
 * Get top items by category for insights
 * Useful for "Most Played Games", "Longest Books", etc.
 */
export async function getTopItemsAction(category: 'games' | 'books' | 'tvshows' | 'movies', limit: number = 5) {
  try {
    let query = ''

    switch (category) {
      case 'games':
        query = `
          SELECT
            title,
            cover_image,
            COALESCE(hours_played, 0) + COALESCE(minutes_played, 0) / 60.0 as hours,
            percentage,
            status
          FROM games
          ORDER BY (COALESCE(hours_played, 0) + COALESCE(minutes_played, 0) / 60.0) DESC
          LIMIT $1
        `
        break
      case 'books':
        query = `
          SELECT
            title,
            author,
            cover_image,
            pages,
            status
          FROM books
          ORDER BY COALESCE(pages, 0) DESC
          LIMIT $1
        `
        break
      case 'tvshows':
        query = `
          SELECT
            title,
            poster_image as cover_image,
            watched_episodes,
            total_episodes,
            status
          FROM tvshows
          ORDER BY COALESCE(watched_episodes, 0) DESC
          LIMIT $1
        `
        break
      case 'movies':
        query = `
          SELECT
            title,
            poster_image as cover_image,
            runtime,
            rating,
            status
          FROM movies
          ORDER BY COALESCE(rating, 0) DESC
          LIMIT $1
        `
        break
    }

    const result = await pool.query(query, [limit])
    return result.rows
  } catch (error) {
    console.error("Error fetching top items:", error)
    throw error
  }
}

/**
 * Get trend data (comparing current period to previous period)
 */
export async function getTrendsAction(period: TimePeriod = "month") {
  try {
    const { start: currentStart, end: currentEnd } = getDateRange(period)

    // Calculate previous period
    const periodDuration = currentEnd.getTime() - currentStart.getTime()
    const previousStart = new Date(currentStart.getTime() - periodDuration)
    const previousEnd = currentStart

    const [currentStats, previousStats] = await Promise.all([
      getStatsAction(period),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE updated_at >= $1 AND updated_at < $2) as games_count,
          COUNT(*) FILTER (WHERE updated_at >= $1 AND updated_at < $2) as books_count
        FROM games, books
      `, [currentStart.toISOString(), currentEnd.toISOString()]),
    ])

    // Calculate percentage changes
    // This is a simplified version - expand based on your needs
    return {
      period,
      current: currentStats,
      trends: {
        gamesChange: 0, // Calculate based on previous period
        booksChange: 0,
        // Add more trend calculations
      }
    }
  } catch (error) {
    console.error("Error fetching trends:", error)
    throw error
  }
}
