import { Pool } from 'pg'
import { Book } from '@/types/book'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

// Pagination parameters interface
export interface PaginatedBooksParams {
  limit?: number // Default 50, max 100
  cursor?: string // Last book ID from previous page
  status?: string // Filter by status (e.g., 'Reading', 'Completed', etc.)
  sortBy?: 'title' | 'author' | 'pages' | 'minutes' | 'dateStarted' | 'created_at'
  sortOrder?: 'asc' | 'desc'
  search?: string
  type?: 'Ebook' | 'Audiobook' | 'All'
}

// Paginated response interface
export interface PaginatedBooksResponse {
  books: Book[]
  nextCursor: string | null
  hasMore: boolean
  total: number
}

// Minimal book data for grid view
export interface BookGridItem {
  id: string
  title: string
  author: string
  coverImage: string
  type: 'Ebook' | 'Audiobook'
  pages: number | null
  minutes: number | null
  status: string
}

function normalizeBook(book: any): Book {
  const formatDate = (date: any) => {
    if (!date) return null
    if (date instanceof Date) return date.toISOString().split('T')[0]
    if (typeof date === 'string') return date.split('T')[0]
    return null
  }

  return {
    ...book,
    id: String(book.id),
    dateStarted: formatDate(book.started_date),
    dateCompleted: formatDate(book.completed_date),
    releaseDate: book.release_date || '',
    pages: book.pages ? Number(book.pages) : null,
    minutes: book.minutes ? Number(book.minutes) : null,
    daysRead: book.days_read ? Number(book.days_read) : 0,
    coverImage: book.cover_image || '',
    author: book.author || '',
    publisher: book.publisher || '',
    genre: book.genre || '',
    type: book.type || 'Ebook',
    notes: book.notes || '',
    createdAt: book.created_at,
    updatedAt: book.updated_at,
  }
}

function normalizeBookGridItem(book: any): BookGridItem {
  return {
    id: String(book.id),
    title: book.title,
    author: book.author || '',
    coverImage: book.cover_image || '',
    type: book.type || 'Ebook',
    pages: book.pages ? Number(book.pages) : null,
    minutes: book.minutes ? Number(book.minutes) : null,
    status: book.status || '',
  }
}

/**
 * Get paginated books optimized for grid view
 * Returns only essential fields for better performance
 */
export async function getBooksGrid(
  params: PaginatedBooksParams = {}
): Promise<PaginatedBooksResponse> {
  const {
    limit = 50,
    cursor,
    status,
    sortBy = 'created_at',
    sortOrder = 'desc',
    search,
    type = 'All',
  } = params

  // Validate and sanitize inputs
  const safeLimit = Math.min(Math.max(1, limit), 100)
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC'

  // Map sortBy to actual column names
  const sortColumnMap: Record<string, string> = {
    title: 'title',
    author: 'author',
    pages: 'pages',
    minutes: 'minutes',
    dateStarted: 'started_date',
    created_at: 'created_at',
  }
  const sortColumn = sortColumnMap[sortBy] || 'created_at'

  // Build query - only select fields needed for grid display
  let query = `
    SELECT
      id,
      title,
      author,
      cover_image,
      type,
      pages,
      minutes,
      status
    FROM books
    WHERE 1=1
  `
  const queryParams: any[] = []
  let paramIndex = 1

  // Cursor pagination
  if (cursor) {
    const cursorData = await pool.query(
      `SELECT ${sortColumn}, id FROM books WHERE id = $1`,
      [cursor]
    )
    if (cursorData.rows.length > 0) {
      const cursorValue = cursorData.rows[0][sortColumn]
      if (safeSortOrder === 'DESC') {
        query += ` AND (${sortColumn} < $${paramIndex} OR (${sortColumn} = $${paramIndex} AND id < $${paramIndex + 1}))`
      } else {
        query += ` AND (${sortColumn} > $${paramIndex} OR (${sortColumn} = $${paramIndex} AND id > $${paramIndex + 1}))`
      }
      queryParams.push(cursorValue, cursor)
      paramIndex += 2
    }
  }

  // Status filter
  if (status && status !== 'All') {
    query += ` AND status = $${paramIndex}`
    queryParams.push(status)
    paramIndex++
  }

  // Type filter
  if (type !== 'All') {
    query += ` AND type = $${paramIndex}`
    queryParams.push(type)
    paramIndex++
  }

  // Search filter
  if (search && search.trim()) {
    query += ` AND (title ILIKE $${paramIndex} OR author ILIKE $${paramIndex})`
    queryParams.push(`%${search.trim()}%`)
    paramIndex++
  }

  // Sorting
  query += ` ORDER BY ${sortColumn} ${safeSortOrder}, id ${safeSortOrder}`

  // Limit
  query += ` LIMIT $${paramIndex}`
  queryParams.push(safeLimit + 1)

  // Execute query
  const result = await pool.query(query, queryParams)
  const books = result.rows.map(normalizeBookGridItem)

  // Check pagination
  const hasMore = books.length > safeLimit
  if (hasMore) books.pop()

  const nextCursor = hasMore && books.length > 0 ? books[books.length - 1].id : null

  // Get total count
  let countQuery = 'SELECT COUNT(*) FROM books WHERE 1=1'
  const countParams: any[] = []
  let countParamIndex = 1

  if (status && status !== 'All') {
    countQuery += ` AND status = $${countParamIndex}`
    countParams.push(status)
    countParamIndex++
  }

  if (type !== 'All') {
    countQuery += ` AND type = $${countParamIndex}`
    countParams.push(type)
    countParamIndex++
  }

  if (search && search.trim()) {
    countQuery += ` AND (title ILIKE $${countParamIndex} OR author ILIKE $${countParamIndex})`
    countParams.push(`%${search.trim()}%`)
  }

  const countResult = await pool.query(countQuery, countParams)
  const total = parseInt(countResult.rows[0].count)

  return {
    books: books as any, // Cast since BookGridItem is subset of Book
    nextCursor,
    hasMore,
    total,
  }
}

/**
 * Get a single book by ID with all details
 * Returns null if book not found
 */
export async function getBookById(id: string): Promise<Book | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM books WHERE id = $1',
      [id]
    )

    if (result.rows.length === 0) {
      return null
    }

    return normalizeBook(result.rows[0])
  } catch (error) {
    console.error('Error fetching book by ID:', error)
    throw new Error('Failed to fetch book details')
  }
}

/**
 * Get cached statistics (for dashboard)
 * Consider implementing Redis cache in production
 */
export async function getBooksStats() {
  const result = await pool.query(`
    SELECT
      COUNT(*) as total,
      SUM(pages) FILTER (WHERE type = 'Ebook') as total_pages,
      SUM(minutes) FILTER (WHERE type = 'Audiobook') as total_minutes,
      COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM started_date) = EXTRACT(YEAR FROM CURRENT_DATE)) as this_year
    FROM books
  `)

  const row = result.rows[0]

  return {
    totalBooks: parseInt(row.total),
    totalPages: parseInt(row.total_pages || 0),
    totalMinutes: parseInt(row.total_minutes || 0),
    booksThisYear: parseInt(row.this_year),
  }
}
