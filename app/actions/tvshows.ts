'use server'

import { TVShow } from '@/types/tvshow'
import { getTVShows, addTVShow, updateTVShow, deleteTVShow, calculateTotalEpisodes, calculateTotalMinutes, calculateTotalDays, markEpisodeWatched } from '@/lib/db/tvshows-store'
import { invalidateStatsCache } from '@/lib/cache/stats-cache'

export async function getTVShowsAction() {
  return await getTVShows()
}

export async function addTVShowAction(show: Omit<TVShow, 'id' | 'createdAt' | 'updatedAt'>) {
  const result = await addTVShow(show)
  // Invalidate stats cache after adding new TV show
  invalidateStatsCache()
  return result
}

export async function updateTVShowAction(id: number, show: Partial<TVShow>) {
  await updateTVShow(id, show)
  // Invalidate stats cache after updating TV show
  invalidateStatsCache()
}

export async function deleteTVShowAction(id: number) {
  await deleteTVShow(id)
  // Invalidate stats cache after deleting TV show
  invalidateStatsCache()
}

export async function getTVShowsStatsAction() {
  const shows = await getTVShows()
  return {
    totalEpisodes: calculateTotalEpisodes(shows),
    totalMinutes: calculateTotalMinutes(shows),
    totalDays: calculateTotalDays(shows),
  }
}

export async function markEpisodeWatchedAction(
  showId: number,
  seasonNumber: number,
  episodeNumber: number,
  watched: boolean,
  dateWatched?: string
) {
  const result = await markEpisodeWatched(showId, seasonNumber, episodeNumber, watched, dateWatched)
  // Invalidate stats cache after marking episode as watched
  invalidateStatsCache()
  return result
}
