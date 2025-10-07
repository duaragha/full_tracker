'use server'

import { Book } from '@/types/book'
import { getBooks, addBook, updateBook, deleteBook, calculateTotalPages, calculateTotalMinutes, calculateTotalDays } from '@/lib/db/books-store'

export async function getBooksAction() {
  return await getBooks()
}

export async function addBookAction(book: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>) {
  return await addBook(book)
}

export async function updateBookAction(id: number, book: Partial<Book>) {
  return await updateBook(id, book)
}

export async function deleteBookAction(id: number) {
  return await deleteBook(id)
}

export async function getBooksStatsAction() {
  const books = await getBooks()
  return {
    totalPages: calculateTotalPages(books),
    totalMinutes: calculateTotalMinutes(books),
    totalDays: calculateTotalDays(books),
  }
}
