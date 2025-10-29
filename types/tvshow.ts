export interface Episode {
  episodeNumber: number
  name: string
  runtime: number // minutes
  airDate: string // when episode originally aired
  watched: boolean
  dateWatched: string | null // when user watched it
}

export interface Season {
  seasonNumber: number
  name: string
  episodes: Episode[]
}

export interface TVShow {
  id: string
  tmdbId: number
  title: string
  status?: string // Optional - defaults to 'Plan to Watch' if not provided
  creators: string[] // show creators/directors
  network: string
  genres: string[]
  posterImage: string
  backdropImage: string
  showStartDate: string // when show first aired
  showEndDate: string | null // when show ended (null if ongoing)
  dateIStarted: string | null // when user started watching
  dateIEnded: string | null // when user finished watching
  totalEpisodes: number
  watchedEpisodes: number
  seasons: Season[]
  totalMinutes: number // calculated from watched episodes
  daysTracking: number // calculated
  rewatchCount: number // number of times rewatched
  rewatchHistory: RewatchEntry[] // history of rewatches
  notes: string
  createdAt: string
  updatedAt: string
}

export interface RewatchEntry {
  startDate: string
  endDate: string | null
  notes?: string
}

export interface TVShowSearchResult {
  id: number
  name: string
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string
  overview: string
  genre_ids: number[]
  origin_country: string[]
  vote_average: number
}

export interface TMDbTVShowDetails {
  id: number
  name: string
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string
  last_air_date: string | null
  genres: Array<{ id: number; name: string }>
  networks: Array<{ id: number; name: string }>
  created_by: Array<{ id: number; name: string }> // show creators
  number_of_seasons: number
  number_of_episodes: number
  episode_run_time: number[]
  overview: string
  status: string
}

export interface TMDbSeason {
  season_number: number
  name: string
  episode_count: number
  episodes?: TMDbEpisode[]
}

export interface TMDbEpisode {
  episode_number: number
  name: string
  runtime: number | null
  air_date: string
  overview: string
}
