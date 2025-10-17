'use server'

import {
  PaginatedBooksParams,
  PaginatedBooksResponse,
  getBooksGrid,
  getBooksStats,
  getBookById,
} from '@/lib/db/books-store-paginated'
import { Book } from '@/types/book'

/**
 * Get paginated books optimized for grid view
 * Returns only essential fields for better performance
 * Use this for grid/card layouts where you don't need full details
 */
export async function getBooksGridAction(
  params: PaginatedBooksParams = {}
): Promise<PaginatedBooksResponse> {
  const startTime = Date.now()

  try {
    const result = await getBooksGrid(params)
    const duration = Date.now() - startTime

    // Log slow queries for monitoring
    if (duration > 200) {
      console.warn(`Slow query: getBooksGrid took ${duration}ms`, {
        params,
        resultCount: result.books.length,
      })
    }

    return result
  } catch (error) {
    console.error('Error fetching books for grid:', error)
    throw new Error('Failed to fetch books for grid view')
  }
}

/**
 * Get a single book by ID with all details
 * Use this for detail modals or when you need complete information about a specific book
 * Returns null if book not found
 */
export async function getBookDetailAction(id: string): Promise<Book | null> {
  try {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid book ID provided')
    }

    return await getBookById(id)
  } catch (error) {
    console.error('Error fetching book detail:', error)
    throw new Error('Failed to fetch book details')
  }
}

/**
 * Get aggregate statistics for books dashboard
 * Returns: total count, total pages, total minutes, books this year
 */
export async function getBooksStatsAction() {
  try {
    return await getBooksStats()
  } catch (error) {
    console.error('Error fetching book statistics:', error)
    throw new Error('Failed to fetch book statistics')
  }
}

/**
 * Prefetch next page of books
 * Can be called when user scrolls near bottom to preload next page
 */
export async function prefetchNextBooksPageAction(
  cursor: string,
  params: Omit<PaginatedBooksParams, 'cursor'> = {}
) {
  try {
    return await getBooksGrid({ ...params, cursor })
  } catch (error) {
    console.error('Error prefetching books:', error)
    return null // Fail silently for prefetch
  }
}
