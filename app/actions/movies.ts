'use server'

import { Movie } from '@/types/movie'
import { getMovies, addMovie, updateMovie, deleteMovie, calculateTotalRuntime, calculateAverageRating } from '@/lib/db/movies-store'
import { invalidateStatsCache } from '@/lib/cache/stats-cache'

export async function getMoviesAction() {
  return await getMovies()
}

export async function addMovieAction(movie: Omit<Movie, 'id' | 'createdAt' | 'updatedAt'>) {
  const result = await addMovie(movie)
  // Invalidate stats cache after adding new movie
  invalidateStatsCache()
  return result
}

export async function updateMovieAction(id: number, movie: Partial<Movie>) {
  await updateMovie(id, movie)
  // Invalidate stats cache after updating movie
  invalidateStatsCache()
}

export async function deleteMovieAction(id: number) {
  await deleteMovie(id)
  // Invalidate stats cache after deleting movie
  invalidateStatsCache()
}

export async function getMoviesStatsAction() {
  const movies = await getMovies()
  return {
    totalRuntime: calculateTotalRuntime(movies),
    avgRating: calculateAverageRating(movies),
  }
}
