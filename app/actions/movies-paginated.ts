'use server'

import {
  PaginatedMoviesParams,
  PaginatedMoviesResponse,
  getMoviesPaginated,
  getMoviesForGrid,
  getMoviesStats,
  getMovieById,
} from '@/lib/db/movies-store-paginated'
import { Movie } from '@/types/movie'

/**
 * Get paginated movies with full data
 * Use this for table views or when you need complete movie information
 */
export async function getMoviesPaginatedAction(
  params: PaginatedMoviesParams = {}
): Promise<PaginatedMoviesResponse> {
  try {
    return await getMoviesPaginated(params)
  } catch (error) {
    console.error('Error fetching paginated movies:', error)
    throw new Error('Failed to fetch movies')
  }
}

/**
 * Get paginated movies optimized for grid view
 * Returns only essential fields for better performance
 * Use this for grid/card layouts where you don't need full details
 */
export async function getMoviesGridAction(
  params: PaginatedMoviesParams = {}
): Promise<PaginatedMoviesResponse> {
  const startTime = Date.now()

  try {
    const result = await getMoviesForGrid(params)
    const duration = Date.now() - startTime

    // Log slow queries for monitoring
    if (duration > 200) {
      console.warn(`Slow query: getMoviesForGrid took ${duration}ms`, {
        params,
        resultCount: result.movies.length,
      })
    }

    return result
  } catch (error) {
    console.error('Error fetching movies for grid:', error)
    throw new Error('Failed to fetch movies for grid view')
  }
}

/**
 * Get aggregate statistics for movies dashboard
 * Returns: total count, total runtime, average rating, movies this year
 */
export async function getMoviesStatsOptimizedAction() {
  try {
    return await getMoviesStats()
  } catch (error) {
    console.error('Error fetching movie statistics:', error)
    throw new Error('Failed to fetch movie statistics')
  }
}

/**
 * Prefetch next page of movies
 * Can be called when user scrolls near bottom to preload next page
 */
export async function prefetchNextMoviesPageAction(
  cursor: string,
  params: Omit<PaginatedMoviesParams, 'cursor'> = {}
) {
  try {
    return await getMoviesForGrid({ ...params, cursor })
  } catch (error) {
    console.error('Error prefetching movies:', error)
    return null // Fail silently for prefetch
  }
}

/**
 * Get a single movie by ID with all details
 * Use this for detail modals or when you need complete information about a specific movie
 * Returns null if movie not found
 */
export async function getMovieDetailAction(id: string): Promise<Movie | null> {
  try {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid movie ID provided')
    }

    return await getMovieById(id)
  } catch (error) {
    console.error('Error fetching movie detail:', error)
    throw new Error('Failed to fetch movie details')
  }
}
