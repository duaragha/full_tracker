import { Pool } from 'pg'
import { Book } from '@/types/book'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

/**
 * Normalizes various date formats from Google Books API to PostgreSQL DATE format (YYYY-MM-DD)
 * Handles:
 * - Just year: "2019" -> "2019-01-01"
 * - Year-month: "2019-07" -> "2019-07-01"
 * - Full date: "2019-07-15" -> "2019-07-15"
 * - Empty/null: null -> null
 */
function normalizeDateForPostgres(dateStr: any): string | null {
  if (!dateStr) {
    return null
  }

  // Convert to string regardless of type
  const strValue = String(dateStr)
  const trimmed = strValue.trim()

  if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
    return null
  }

  // Full date format (YYYY-MM-DD) - already valid
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  // Year-month format (YYYY-MM) - add day
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return `${trimmed}-01`
  }

  // Just year (YYYY) - add month and day
  if (/^\d{4}$/.test(trimmed)) {
    return `${trimmed}-01-01`
  }

  // Invalid format - return null to avoid database errors
  console.warn(`Invalid date format received: ${dateStr}. Storing as null.`)
  return null
}

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
    seriesId: book.series_id || null,
    seriesName: book.series_name || null,
    positionInSeries: book.position_in_series ? Number(book.position_in_series) : null,
    detectionMethod: book.detection_method || null,
  }
}

export async function getBooks(): Promise<Book[]> {
  const result = await pool.query<any>(
    `SELECT
      b.id, b.title, b.author, b.status, b.rating, b.pages, b.current_page, b.started_date, b.completed_date,
      b.notes, b.genre, b.cover_image, b.isbn, b.created_at, b.updated_at, b.release_date, b.type, b.minutes,
      bs.id as series_id,
      bs.name as series_name,
      bsm.position_in_series,
      bsm.detection_method,
      CASE
        WHEN b.started_date IS NOT NULL AND b.completed_date IS NOT NULL THEN
          (b.completed_date::date - b.started_date::date) + 1
        WHEN b.started_date IS NOT NULL THEN
          (CURRENT_DATE - b.started_date::date) + 1
        ELSE 0
      END as days_read
    FROM books b
    LEFT JOIN book_series_memberships bsm ON b.id = bsm.book_id
    LEFT JOIN book_series bs ON bsm.series_id = bs.id
    ORDER BY b.created_at DESC`
  )
  return result.rows.map(normalizeBook)
}

export async function addBook(book: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>): Promise<Book> {
  const result = await pool.query<any>(
    `INSERT INTO books (
      title, author, status, release_date, genre, cover_image, type,
      pages, minutes, started_date, completed_date, notes, rating, days_read,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
    RETURNING *`,
    [
      book.title,
      book.author,
      book.status || 'Want to Read', // Default status if not provided
      normalizeDateForPostgres(book.releaseDate),
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
      status = COALESCE($3, status),
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
      book.status,
      book.releaseDate !== undefined ? normalizeDateForPostgres(book.releaseDate) : undefined,
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
