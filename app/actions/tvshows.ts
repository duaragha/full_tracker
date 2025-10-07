'use server'

import { TVShow } from '@/types/tvshow'
import { getTVShows, addTVShow, updateTVShow, deleteTVShow, calculateTotalEpisodes, calculateTotalMinutes, calculateTotalDays } from '@/lib/db/tvshows-store'

export async function getTVShowsAction() {
  return await getTVShows()
}

export async function addTVShowAction(show: Omit<TVShow, 'id' | 'createdAt' | 'updatedAt'>) {
  return await addTVShow(show)
}

export async function updateTVShowAction(id: number, show: Partial<TVShow>) {
  return await updateTVShow(id, show)
}

export async function deleteTVShowAction(id: number) {
  return await deleteTVShow(id)
}

export async function getTVShowsStatsAction() {
  const shows = await getTVShows()
  return {
    totalEpisodes: calculateTotalEpisodes(shows),
    totalMinutes: calculateTotalMinutes(shows),
    totalDays: calculateTotalDays(shows),
  }
}
