'use server'

import { Book } from '@/types/book'
import { getBooks, addBook, updateBook, deleteBook, calculateTotalPages, calculateTotalMinutes, calculateTotalDays } from '@/lib/db/books-store'
import { invalidateStatsCache } from '@/lib/cache/stats-cache'

export async function getBooksAction() {
  return await getBooks()
}

export async function addBookAction(book: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>) {
  const result = await addBook(book)
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
