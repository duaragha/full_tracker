import { GameSearchResult } from '@/types/game'

const RAWG_API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY || 'YOUR_API_KEY'
const RAWG_API_URL = 'https://api.rawg.io/api'

export async function searchGames(query: string): Promise<GameSearchResult[]> {
  try {
    const response = await fetch(
      `${RAWG_API_URL}/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(query)}&page_size=10`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch games')
    }

    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error('Error searching games:', error)
    return []
  }
}

export async function getGameDetails(id: number): Promise<GameSearchResult | null> {
  try {
    const response = await fetch(
      `${RAWG_API_URL}/games/${id}?key=${RAWG_API_KEY}`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch game details')
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching game details:', error)
    return null
  }
}
