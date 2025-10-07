'use server'

import { Movie } from '@/types/movie'
import { getMovies, addMovie, updateMovie, deleteMovie, calculateTotalRuntime, calculateAverageRating } from '@/lib/db/movies-store'

export async function getMoviesAction() {
  return await getMovies()
}

export async function addMovieAction(movie: Omit<Movie, 'id' | 'createdAt' | 'updatedAt'>) {
  return await addMovie(movie)
}

export async function updateMovieAction(id: number, movie: Partial<Movie>) {
  return await updateMovie(id, movie)
}

export async function deleteMovieAction(id: number) {
  return await deleteMovie(id)
}

export async function getMoviesStatsAction() {
  const movies = await getMovies()
  return {
    totalRuntime: calculateTotalRuntime(movies),
    avgRating: calculateAverageRating(movies),
  }
}
