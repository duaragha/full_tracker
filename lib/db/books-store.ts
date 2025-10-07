import { Pool } from 'pg'
import { Book } from '@/types/book'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

function normalizeBook(book: any): Book {
  return {
    ...book,
    dateStarted: book.started_date instanceof Date ? book.started_date.toISOString().split('T')[0] : book.started_date,
    dateCompleted: book.completed_date instanceof Date ? book.completed_date.toISOString().split('T')[0] : book.completed_date,
    pages: book.pages ? Number(book.pages) : null,
    minutes: book.minutes ? Number(book.minutes) : null,
    rating: book.rating ? Number(book.rating) : null,
    daysRead: book.days_read ? Number(book.days_read) : null,
    releaseDate: book.release_date,
    coverImage: book.cover_image,
  }
}

export async function getBooks(): Promise<Book[]> {
  const result = await pool.query<any>(
    'SELECT * FROM books ORDER BY created_at DESC'
  )
  return result.rows.map(normalizeBook)
}

export async function addBook(book: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>): Promise<Book> {
  const result = await pool.query<any>(
    `INSERT INTO books (
      title, author, publisher, release_date, genre, cover_image, type,
      pages, minutes, started_date, completed_date, notes, rating, days_read,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
    RETURNING *`,
    [
      book.title,
      book.author,
      book.publisher,
      book.releaseDate,
      book.genre,
      book.coverImage,
      book.type,
      book.pages,
      book.minutes,
      book.dateStarted,
      book.dateCompleted,
      book.notes,
      book.rating,
      book.daysRead,
    ]
  )
  return normalizeBook(result.rows[0])
}

export async function updateBook(id: number, book: Partial<Book>): Promise<void> {
  await pool.query(
    `UPDATE books SET
      title = COALESCE($1, title),
      author = COALESCE($2, author),
      publisher = COALESCE($3, publisher),
      release_date = COALESCE($4, release_date),
      genre = COALESCE($5, genre),
      cover_image = COALESCE($6, cover_image),
      type = COALESCE($7, type),
      pages = $8,
      minutes = $9,
      started_date = $10,
      completed_date = $11,
      notes = COALESCE($12, notes),
      rating = $13,
      days_read = $14,
      updated_at = NOW()
    WHERE id = $15`,
    [
      book.title,
      book.author,
      book.publisher,
      book.releaseDate,
      book.genre,
      book.coverImage,
      book.type,
      book.pages,
      book.minutes,
      book.dateStarted,
      book.dateCompleted,
      book.notes,
      book.rating,
      book.daysRead,
      id,
    ]
  )
}

export async function deleteBook(id: number): Promise<void> {
  await pool.query('DELETE FROM books WHERE id = $1', [id])
}

export function calculateTotalPages(books: Book[]): number {
  return books.filter(b => b.type === 'Ebook').reduce((total, book) => total + (book.pages || 0), 0)
}

export function calculateTotalMinutes(books: Book[]): number {
  return books.filter(b => b.type === 'Audiobook').reduce((total, book) => total + (book.minutes || 0), 0)
}

export function calculateTotalDays(books: Book[]): number {
  return books.reduce((total, book) => total + (book.daysRead || 0), 0)
}

export function calculateAverageRating(books: Book[]): number {
  const rated = books.filter(b => b.rating)
  if (rated.length === 0) return 0
  const sum = rated.reduce((total, book) => total + (book.rating || 0), 0)
  return Math.round((sum / rated.length) * 10)
}
