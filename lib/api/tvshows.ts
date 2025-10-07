import { TVShowSearchResult, TMDbTVShowDetails, TMDbSeason, TMDbEpisode } from "@/types/tvshow"

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY
const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p"

export async function searchTVShows(query: string): Promise<TVShowSearchResult[]> {
  if (!query.trim()) return []

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`
    )

    if (!response.ok) {
      throw new Error("Failed to search TV shows")
    }

    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error("Error searching TV shows:", error)
    return []
  }
}

export async function getTVShowDetails(tvShowId: number): Promise<TMDbTVShowDetails | null> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${tvShowId}?api_key=${TMDB_API_KEY}&language=en-US`
    )

    if (!response.ok) {
      throw new Error("Failed to fetch TV show details")
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error fetching TV show details:", error)
    return null
  }
}

export async function getSeasonDetails(
  tvShowId: number,
  seasonNumber: number
): Promise<TMDbSeason | null> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${tvShowId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=en-US`
    )

    if (!response.ok) {
      throw new Error("Failed to fetch season details")
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error fetching season details:", error)
    return null
  }
}

export async function getAllSeasons(
  tvShowId: number,
  numberOfSeasons: number
): Promise<TMDbSeason[]> {
  const seasons: TMDbSeason[] = []

  for (let i = 1; i <= numberOfSeasons; i++) {
    const season = await getSeasonDetails(tvShowId, i)
    if (season) {
      seasons.push(season)
    }
  }

  return seasons
}

export function getPosterUrl(posterPath: string | null, size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w342'): string {
  if (!posterPath) return "/placeholder-tv.png"
  return `${TMDB_IMAGE_BASE_URL}/${size}${posterPath}`
}

export function getBackdropUrl(backdropPath: string | null, size: 'w300' | 'w780' | 'w1280' | 'original' = 'w780'): string {
  if (!backdropPath) return "/placeholder-backdrop.png"
  return `${TMDB_IMAGE_BASE_URL}/${size}${backdropPath}`
}
