'use server'

import { Book } from '@/types/book'
import { getBooks, addBook, updateBook, deleteBook, calculateTotalPages, calculateTotalMinutes, calculateTotalDays } from '@/lib/db/books-store'
import { invalidateStatsCache } from '@/lib/cache/stats-cache'
import { BookSeriesDetectionService } from '@/lib/services/book-series-detection-service'

export async function getBooksAction() {
  return await getBooks()
}

export async function addBookAction(book: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>) {
  const result = await addBook(book)

  // Automatically detect series for the new book
  try {
    await BookSeriesDetectionService.autoDetectAndLinkSeries(
      parseInt(result.id),
      result.title,
      result.author,
      book.isbn
    )
  } catch (error) {
    console.error('[Books] Error auto-detecting series:', error)
    // Don't fail the book addition if series detection fails
  }

  // Invalidate stats cache after adding new book
  invalidateStatsCache()
  return result
}

export async function updateBookAction(id: number, book: Partial<Book>) {
  await updateBook(id, book)
  // Invalidate stats cache after updating book
  invalidateStatsCache()
}

export async function deleteBookAction(id: number) {
  await deleteBook(id)
  // Invalidate stats cache after deleting book
  invalidateStatsCache()
}

export async function getBooksStatsAction() {
  const books = await getBooks()
  return {
    totalPages: calculateTotalPages(books),
    totalMinutes: calculateTotalMinutes(books),
    totalDays: calculateTotalDays(books),
  }
}

export async function getAllSeriesAction() {
  return await BookSeriesDetectionService.getAllSeriesWithBooks()
}

export async function scanAllBooksForSeriesAction() {
  return await BookSeriesDetectionService.scanAllBooksForSeries()
}

export async function linkBookToSeriesAction(bookId: number, seriesName: string, position?: number) {
  const seriesId = await BookSeriesDetectionService.findOrCreateSeries(seriesName)
  await BookSeriesDetectionService.linkBookToSeries(bookId, seriesId, position, 'manual', 1.0)
  invalidateStatsCache()
}

export async function unlinkBookFromSeriesAction(bookId: number) {
  await BookSeriesDetectionService.unlinkBookFromSeries(bookId)
  invalidateStatsCache()
}

export async function deleteSeriesAction(seriesId: number) {
  await BookSeriesDetectionService.deleteSeries(seriesId)
  invalidateStatsCache()
}

export async function deleteSeriesByNameAction(seriesName: string) {
  await BookSeriesDetectionService.deleteSeriesByName(seriesName)
  invalidateStatsCache()
}
