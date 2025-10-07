import { MovieSearchResult, TMDbMovieDetails, TMDbMovieCredits } from "@/types/movie"

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY
const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p"

export async function searchMovies(query: string): Promise<MovieSearchResult[]> {
  if (!query.trim()) return []

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`
    )

    if (!response.ok) {
      throw new Error("Failed to search movies")
    }

    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error("Error searching movies:", error)
    return []
  }
}

export async function getMovieDetails(movieId: number): Promise<TMDbMovieDetails | null> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US`
    )

    if (!response.ok) {
      throw new Error("Failed to fetch movie details")
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error fetching movie details:", error)
    return null
  }
}

export async function getMovieCredits(movieId: number): Promise<TMDbMovieCredits | null> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}/credits?api_key=${TMDB_API_KEY}&language=en-US`
    )

    if (!response.ok) {
      throw new Error("Failed to fetch movie credits")
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error fetching movie credits:", error)
    return null
  }
}

export function getMoviePosterUrl(posterPath: string | null, size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w342'): string {
  if (!posterPath) return "/placeholder-movie.png"
  return `${TMDB_IMAGE_BASE_URL}/${size}${posterPath}`
}

export function getMovieBackdropUrl(backdropPath: string | null, size: 'w300' | 'w780' | 'w1280' | 'original' = 'w780'): string {
  if (!backdropPath) return "/placeholder-backdrop.png"
  return `${TMDB_IMAGE_BASE_URL}/${size}${backdropPath}`
}
