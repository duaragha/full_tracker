import { TVShow, Episode } from "@/types/tvshow"

const STORAGE_KEY = "tvshows"

export function getTVShows(): TVShow[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(STORAGE_KEY)
  return data ? JSON.parse(data) : []
}

function saveTVShows(tvshows: TVShow[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tvshows))
}

export function addTVShow(tvshow: Omit<TVShow, "id" | "createdAt" | "updatedAt">) {
  const tvshows = getTVShows()
  const newTVShow: TVShow = {
    ...tvshow,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  tvshows.push(newTVShow)
  saveTVShows(tvshows)
  return newTVShow
}

export function updateTVShow(id: string, updates: Partial<TVShow>) {
  const tvshows = getTVShows()
  const index = tvshows.findIndex((show) => show.id === id)
  if (index !== -1) {
    tvshows[index] = {
      ...tvshows[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    saveTVShows(tvshows)
  }
}

export function deleteTVShow(id: string) {
  const tvshows = getTVShows()
  const filtered = tvshows.filter((show) => show.id !== id)
  saveTVShows(filtered)
}

export function markEpisodeWatched(
  showId: string,
  seasonNumber: number,
  episodeNumber: number,
  watched: boolean,
  dateWatched?: string
) {
  const tvshows = getTVShows()
  const show = tvshows.find((s) => s.id === showId)

  if (!show) return

  const season = show.seasons.find((s) => s.seasonNumber === seasonNumber)
  if (!season) return

  const episode = season.episodes.find((e) => e.episodeNumber === episodeNumber)
  if (!episode) return

  episode.watched = watched
  episode.dateWatched = watched ? (dateWatched || new Date().toISOString()) : null

  // Recalculate totals
  show.watchedEpisodes = show.seasons.reduce(
    (total, s) => total + s.episodes.filter((e) => e.watched).length,
    0
  )
  show.totalMinutes = show.seasons.reduce(
    (total, s) =>
      total +
      s.episodes
        .filter((e) => e.watched)
        .reduce((sum, e) => sum + (e.runtime || 0), 0),
    0
  )

  // Update days tracking if all episodes are watched
  if (show.watchedEpisodes === show.totalEpisodes && !show.dateIEnded) {
    show.dateIEnded = new Date().toISOString()
  }

  // Recalculate days tracking
  if (show.dateIStarted && show.dateIEnded) {
    const start = new Date(show.dateIStarted)
    const end = new Date(show.dateIEnded)
    show.daysTracking = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  } else if (show.dateIStarted) {
    const start = new Date(show.dateIStarted)
    const now = new Date()
    show.daysTracking = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }

  show.updatedAt = new Date().toISOString()
  saveTVShows(tvshows)
}

export function calculateTotalShows(tvshows: TVShow[]): number {
  return tvshows.length
}

export function calculateTotalEpisodesWatched(tvshows: TVShow[]): number {
  return tvshows.reduce((total, show) => total + show.watchedEpisodes, 0)
}

export function calculateTotalMinutesWatched(tvshows: TVShow[]): number {
  return tvshows.reduce((total, show) => total + show.totalMinutes, 0)
}

export function calculateTotalDaysTracking(tvshows: TVShow[]): number {
  return tvshows.reduce((total, show) => total + show.daysTracking, 0)
}
