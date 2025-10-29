import { BookSearchResult } from '@/types/book'

// ========== GOOGLE BOOKS API ==========
const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes'

export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  try {
    const response = await fetch(
      `${GOOGLE_BOOKS_API_URL}?q=${encodeURIComponent(query)}&maxResults=10`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch books from Google Books API')
    }

    const data = await response.json()

    // Map Google Books response to BookSearchResult format
    return (data.items || []).map((item: any) => ({
      key: item.id,
      title: item.volumeInfo?.title || 'Untitled',
      author_name: item.volumeInfo?.authors || [],
      first_publish_year: item.volumeInfo?.publishedDate
        ? parseInt(item.volumeInfo.publishedDate.split('-')[0])
        : undefined,
      publisher: item.volumeInfo?.publisher ? [item.volumeInfo.publisher] : [],
      subject: item.volumeInfo?.categories || [],
      cover_i: undefined,
      cover_url: item.volumeInfo?.imageLinks?.thumbnail ||
                 item.volumeInfo?.imageLinks?.smallThumbnail,
      isbn: item.volumeInfo?.industryIdentifiers?.map((id: any) => id.identifier) || [],
    }))
  } catch (error) {
    console.error('Error searching books:', error)
    return []
  }
}

export function getBookCoverUrl(coverId: number, size: 'S' | 'M' | 'L' = 'M'): string {
  // Google Books provides direct image URLs in the response
  // This function is kept for backwards compatibility
  return ''
}

export async function getBookDetails(key: string): Promise<any> {
  try {
    const response = await fetch(`${GOOGLE_BOOKS_API_URL}/${key}`)

    if (!response.ok) {
      throw new Error('Failed to fetch book details')
    }

    const data = await response.json()
    return data.volumeInfo || null
  } catch (error) {
    console.error('Error fetching book details:', error)
    return null
  }
}

// ========== HARDCOVER API (COMMENTED OUT) ==========
// Note: Hardcover API requires server-side authentication
// See app/api/books/search/route.ts and app/api/books/details/route.ts for implementation
//
// const HARDCOVER_API_URL = 'https://api.hardcover.app/v1/graphql'
// const HARDCOVER_AUTH_TOKEN = 'Bearer ...'
//
// export async function searchBooks(query: string): Promise<BookSearchResult[]> {
//   try {
//     const response = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`)
//     if (!response.ok) throw new Error('Failed to search books')
//     return await response.json()
//   } catch (error) {
//     console.error('Error searching books:', error)
//     return []
//   }
// }

// ========== OPEN LIBRARY API (COMMENTED OUT) ==========
// const OPEN_LIBRARY_API_URL = 'https://openlibrary.org'
//
// export async function searchBooks(query: string): Promise<BookSearchResult[]> {
//   try {
//     const response = await fetch(
//       `${OPEN_LIBRARY_API_URL}/search.json?q=${encodeURIComponent(query)}&limit=10`
//     )
//
//     if (!response.ok) {
//       throw new Error('Failed to fetch books')
//     }
//
//     const data = await response.json()
//     return data.docs || []
//   } catch (error) {
//     console.error('Error searching books:', error)
//     return []
//   }
// }
//
// export function getBookCoverUrl(coverId: number, size: 'S' | 'M' | 'L' = 'M'): string {
//   return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`
// }
//
// export async function getBookDetails(key: string): Promise<any> {
//   try {
//     const response = await fetch(`${OPEN_LIBRARY_API_URL}${key}.json`)
//
//     if (!response.ok) {
//       throw new Error('Failed to fetch book details')
//     }
//
//     return await response.json()
//   } catch (error) {
//     console.error('Error fetching book details:', error)
//     return null
//   }
// }
