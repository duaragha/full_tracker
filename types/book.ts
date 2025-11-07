export interface Book {
  id: string
  title: string
  author: string
  status?: string // Optional - defaults to 'Want to Read' if not provided
  releaseDate: string
  genre: string
  coverImage: string
  type: 'Ebook' | 'Audiobook' | 'Physical'
  pages: number | null
  minutes: number | null
  daysRead: number
  dateStarted: string | null
  dateCompleted: string | null
  notes: string
  isbn?: string
  publisher?: string
  createdAt: string
  updatedAt: string
  seriesId?: number | null
  seriesName?: string | null
  positionInSeries?: number | null
  detectionMethod?: string | null
}

export interface BookSeries {
  id: number
  name: string
  description?: string
  totalBooks?: number
  createdAt: string
  updatedAt: string
}

export interface BookSeriesMembership {
  id: number
  bookId: number
  seriesId: number
  positionInSeries?: number
  detectionMethod: 'manual' | 'google_books' | 'title_pattern'
  confidenceScore: number
  createdAt: string
}

export interface BookSearchResult {
  key: string
  title: string
  author_name?: string[]
  first_publish_year?: number
  publisher?: string[]
  subject?: string[]
  cover_i?: number
  cover_url?: string // Hardcover direct image URL
  isbn?: string[]
}
