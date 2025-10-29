import { NextRequest, NextResponse } from 'next/server'

const HARDCOVER_API_URL = 'https://api.hardcover.app/v1/graphql'
const HARDCOVER_AUTH_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJIYXJkY292ZXIiLCJ2ZXJzaW9uIjoiOCIsImp0aSI6IjBjNDg3Njc1LTU0MzYtNDU4OC1iZDA2LWVmYjE5NWVjYWY0MCIsImFwcGxpY2F0aW9uSWQiOjIsInN1YiI6IjUyMzQyIiwiYXVkIjoiMSIsImlkIjoiNTIzNDIiLCJsb2dnZWRJbiI6dHJ1ZSwiaWF0IjoxNzYxNzQyNzIxLCJleHAiOjE3OTMyNzg3MjEsImh0dHBzOi8vaGFzdXJhLmlvL2p3dC9jbGFpbXMiOnsieC1oYXN1cmEtYWxsb3dlZC1yb2xlcyI6WyJ1c2VyIl0sIngtaGFzdXJhLWRlZmF1bHQtcm9sZSI6InVzZXIiLCJ4LWhhc3VyYS1yb2xlIjoidXNlciIsIlgtaGFzdXJhLXVzZXItaWQiOiI1MjM0MiJ9LCJ1c2VyIjp7ImlkIjo1MjM0Mn19.lIy8cHpOVLXEfcYF2v41ZYToWNOdBnZOTQbl2VLa31c'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const key = searchParams.get('key')

  if (!key) {
    return NextResponse.json({ error: 'Key parameter required' }, { status: 400 })
  }

  try {
    const bookId = key.replace('/books/', '')
    const graphqlQuery = `
      query GetBook($id: Int!) {
        books_by_pk(id: $id) {
          id
          title
          cached_contributors
          release_year
          image {
            url
          }
          description
        }
      }
    `

    const response = await fetch(HARDCOVER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': HARDCOVER_AUTH_TOKEN,
      },
      body: JSON.stringify({
        query: graphqlQuery,
        variables: { id: parseInt(bookId) }
      }),
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

    return NextResponse.json(result.data?.books_by_pk || null)
  } catch (error) {
    console.error('Error fetching book details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch book details' },
      { status: 500 }
    )
  }
}
