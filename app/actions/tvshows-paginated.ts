'use server'

import {
  PaginatedTVShowsParams,
  PaginatedTVShowsResponse,
  getTVShowsGrid,
  getTVShowsStats,
  getTVShowById,
} from '@/lib/db/tvshows-store-paginated'
import { TVShow } from '@/types/tvshow'

/**
 * Get paginated TV shows optimized for grid view
 * Returns only essential fields for better performance
 * Use this for grid/card layouts where you don't need full details
 */
export async function getTVShowsGridAction(
  params: PaginatedTVShowsParams = {}
): Promise<PaginatedTVShowsResponse> {
  const startTime = Date.now()

  try {
    const result = await getTVShowsGrid(params)
    const duration = Date.now() - startTime

    // Log slow queries for monitoring
    if (duration > 200) {
      console.warn(`Slow query: getTVShowsGrid took ${duration}ms`, {
        params,
        resultCount: result.tvshows.length,
      })
    }

    return result
  } catch (error) {
    console.error('Error fetching TV shows for grid:', error)
    throw new Error('Failed to fetch TV shows for grid view')
  }
}

/**
 * Get a single TV show by ID with all details
 * Use this for detail modals or when you need complete information about a specific TV show
 * Returns null if TV show not found
 */
export async function getTVShowDetailAction(id: string): Promise<TVShow | null> {
  try {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid TV show ID provided')
    }

    return await getTVShowById(id)
  } catch (error) {
    console.error('Error fetching TV show detail:', error)
    throw new Error('Failed to fetch TV show details')
  }
}

/**
 * Get aggregate statistics for TV shows dashboard
 * Returns: total count, total watched episodes, total minutes, shows this year
 */
export async function getTVShowsStatsAction() {
  try {
    return await getTVShowsStats()
  } catch (error) {
    console.error('Error fetching TV show statistics:', error)
    throw new Error('Failed to fetch TV show statistics')
  }
}

/**
 * Prefetch next page of TV shows
 * Can be called when user scrolls near bottom to preload next page
 */
export async function prefetchNextTVShowsPageAction(
  cursor: string,
  params: Omit<PaginatedTVShowsParams, 'cursor'> = {}
) {
  try {
    return await getTVShowsGrid({ ...params, cursor })
  } catch (error) {
    console.error('Error prefetching TV shows:', error)
    return null // Fail silently for prefetch
  }
}
