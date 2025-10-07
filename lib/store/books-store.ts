import { Book } from '@/types/book'

const STORAGE_KEY = 'full_tracker_books'

export function getBooks(): Book[] {
  if (typeof window === 'undefined') return []

  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Error loading books:', error)
    return []
  }
}

export function saveBooks(books: Book[]): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books))
  } catch (error) {
    console.error('Error saving books:', error)
  }
}

export function addBook(book: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>): Book {
  const books = getBooks()
  const newBook: Book = {
    ...book,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  books.push(newBook)
  saveBooks(books)
  return newBook
}

export function updateBook(id: string, updates: Partial<Book>): Book | null {
  const books = getBooks()
  const index = books.findIndex(b => b.id === id)

  if (index === -1) return null

  books[index] = {
    ...books[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  saveBooks(books)
  return books[index]
}

export function deleteBook(id: string): boolean {
  const books = getBooks()
  const filtered = books.filter(b => b.id !== id)

  if (filtered.length === books.length) return false

  saveBooks(filtered)
  return true
}

export function calculateTotalPages(books: Book[]): number {
  return books
    .filter(b => b.type === 'Ebook' && b.pages)
    .reduce((total, book) => total + (book.pages || 0), 0)
}

export function calculateTotalMinutes(books: Book[]): number {
  return books
    .filter(b => b.type === 'Audiobook' && b.minutes)
    .reduce((total, book) => total + (book.minutes || 0), 0)
}

export function calculateTotalDays(books: Book[]): number {
  return books.reduce((total, book) => total + book.daysRead, 0)
}
