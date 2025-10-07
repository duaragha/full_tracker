import { BookSearchResult } from '@/types/book'

const OPEN_LIBRARY_API_URL = 'https://openlibrary.org'

export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  try {
    const response = await fetch(
      `${OPEN_LIBRARY_API_URL}/search.json?q=${encodeURIComponent(query)}&limit=10`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch books')
    }

    const data = await response.json()
    return data.docs || []
  } catch (error) {
    console.error('Error searching books:', error)
    return []
  }
}

export function getBookCoverUrl(coverId: number, size: 'S' | 'M' | 'L' = 'M'): string {
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`
}

export async function getBookDetails(key: string): Promise<any> {
  try {
    const response = await fetch(`${OPEN_LIBRARY_API_URL}${key}.json`)

    if (!response.ok) {
      throw new Error('Failed to fetch book details')
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching book details:', error)
    return null
  }
}
