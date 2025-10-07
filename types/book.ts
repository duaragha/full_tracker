export interface Book {
  id: string
  title: string
  author: string
  publisher: string
  releaseDate: string
  genre: string
  coverImage: string
  type: 'Ebook' | 'Audiobook'
  pages: number | null
  minutes: number | null
  daysRead: number
  dateStarted: string | null
  dateCompleted: string | null
  notes: string
  createdAt: string
  updatedAt: string
}

export interface BookSearchResult {
  key: string
  title: string
  author_name?: string[]
  first_publish_year?: number
  publisher?: string[]
  subject?: string[]
  cover_i?: number
  isbn?: string[]
}
