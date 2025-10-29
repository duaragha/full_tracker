import { NextRequest, NextResponse } from 'next/server'

const HARDCOVER_API_URL = 'https://api.hardcover.app/v1/graphql'
const HARDCOVER_AUTH_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJIYXJkY292ZXIiLCJ2ZXJzaW9uIjoiOCIsImp0aSI6IjBjNDg3Njc1LTU0MzYtNDU4OC1iZDA2LWVmYjE5NWVjYWY0MCIsImFwcGxpY2F0aW9uSWQiOjIsInN1YiI6IjUyMzQyIiwiYXVkIjoiMSIsImlkIjoiNTIzNDIiLCJsb2dnZWRJbiI6dHJ1ZSwiaWF0IjoxNzYxNzQyNzIxLCJleHAiOjE3OTMyNzg3MjEsImh0dHBzOi8vaGFzdXJhLmlvL2p3dC9jbGFpbXMiOnsieC1oYXN1cmEtYWxsb3dlZC1yb2xlcyI6WyJ1c2VyIl0sIngtaGFzdXJhLWRlZmF1bHQtcm9sZSI6InVzZXIiLCJ4LWhhc3VyYS1yb2xlIjoidXNlciIsIlgtaGFzdXJhLXVzZXItaWQiOiI1MjM0MiJ9LCJ1c2VyIjp7ImlkIjo1MjM0Mn19.lIy8cHpOVLXEfcYF2v41ZYToWNOdBnZOTQbl2VLa31c'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 })
  }

  try {
    const graphqlQuery = `
      query SearchBooks {
        books(limit: 50, order_by: {title: asc}) {
          id
          title
          cached_contributors
          release_year
          image {
            url
          }
        }
      }
    `

    const response = await fetch(HARDCOVER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': HARDCOVER_AUTH_TOKEN,
      },
      body: JSON.stringify({ query: graphqlQuery }),
    })

    if (!response.ok) {
      throw new Error(`Hardcover API request failed: ${response.statusText}`)
    }

    const result = await response.json()

    if (result.errors) {
      console.error('GraphQL errors:', result.errors)
      return NextResponse.json(
        { error: result.errors[0]?.message || 'GraphQL query failed' },
        { status: 500 }
      )
    }

    // Filter books client-side since Hardcover doesn't support _ilike
    const filteredBooks = (result.data?.books || [])
      .filter((book: any) =>
        book.title && book.title.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 10)

    // Map Hardcover response to BookSearchResult format
    const books = filteredBooks.map((book: any) => ({
      key: `/books/${book.id}`,
      title: book.title || 'Untitled',
      author_name: book.cached_contributors?.map((c: any) => c.author?.name).filter(Boolean),
      first_publish_year: book.release_year,
      publisher: undefined,
      cover_i: book.image?.url ? parseInt(book.id) : undefined,
      cover_url: book.image?.url,
      isbn: undefined,
    }))

    return NextResponse.json(books)
  } catch (error) {
    console.error('Error searching books:', error)
    return NextResponse.json(
      { error: 'Failed to search books' },
      { status: 500 }
    )
  }
}
