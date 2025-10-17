'use server'

import {
  PaginatedGamesParams,
  PaginatedGamesResponse,
  getGamesGrid,
  getGamesStats,
  getGameById,
} from '@/lib/db/games-store-paginated'
import { Game } from '@/types/game'

/**
 * Get paginated games optimized for grid view
 * Returns only essential fields for better performance
 * Use this for grid/card layouts where you don't need full details
 */
export async function getGamesGridAction(
  params: PaginatedGamesParams = {}
): Promise<PaginatedGamesResponse> {
  const startTime = Date.now()

  try {
    const result = await getGamesGrid(params)
    const duration = Date.now() - startTime

    // Log slow queries for monitoring
    if (duration > 200) {
      console.warn(`Slow query: getGamesGrid took ${duration}ms`, {
        params,
        resultCount: result.games.length,
      })
    }

    return result
  } catch (error) {
    console.error('Error fetching games for grid:', error)
    throw new Error('Failed to fetch games for grid view')
  }
}

/**
 * Get a single game by ID with all details
 * Use this for detail modals or when you need complete information about a specific game
 * Returns null if game not found
 */
export async function getGameDetailAction(id: string): Promise<Game | null> {
  try {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid game ID provided')
    }

    return await getGameById(id)
  } catch (error) {
    console.error('Error fetching game detail:', error)
    throw new Error('Failed to fetch game details')
  }
}

/**
 * Get aggregate statistics for games dashboard
 * Returns: total count, total hours, average percentage, games this year
 */
export async function getGamesStatsAction() {
  try {
    return await getGamesStats()
  } catch (error) {
    console.error('Error fetching game statistics:', error)
    throw new Error('Failed to fetch game statistics')
  }
}

/**
 * Prefetch next page of games
 * Can be called when user scrolls near bottom to preload next page
 */
export async function prefetchNextGamesPageAction(
  cursor: string,
  params: Omit<PaginatedGamesParams, 'cursor'> = {}
) {
  try {
    return await getGamesGrid({ ...params, cursor })
  } catch (error) {
    console.error('Error prefetching games:', error)
    return null // Fail silently for prefetch
  }
}
