export interface Movie {
  id: string
  tmdbId: number
  title: string
  director: string
  genres: string[]
  runtime: number // minutes
  releaseDate: string
  releaseYear: number | null
  posterImage: string
  backdropImage: string
  status: 'Watched' | 'Watchlist'
  dateWatched: string | null
  watchlistAddedDate: string | null
  rating: number | null // user's personal rating 1-10
  notes: string
  createdAt: string
  updatedAt: string
}

export interface MovieSearchResult {
  id: number
  title: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  overview: string
  genre_ids: number[]
  vote_average: number
}

export interface TMDbMovieDetails {
  id: number
  title: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  genres: Array<{ id: number; name: string }>
  runtime: number | null
  overview: string
  status: string
}

export interface TMDbMovieCredits {
  crew: Array<{
    id: number
    name: string
    job: string
    department: string
  }>
}
