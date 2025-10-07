import { Movie } from "@/types/movie"

const STORAGE_KEY = "movies"

export function getMovies(): Movie[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(STORAGE_KEY)
  return data ? JSON.parse(data) : []
}

function saveMovies(movies: Movie[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(movies))
}

export function addMovie(movie: Omit<Movie, "id" | "createdAt" | "updatedAt">) {
  const movies = getMovies()
  const newMovie: Movie = {
    ...movie,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  movies.push(newMovie)
  saveMovies(movies)
  return newMovie
}

export function updateMovie(id: string, updates: Partial<Movie>) {
  const movies = getMovies()
  const index = movies.findIndex((movie) => movie.id === id)
  if (index !== -1) {
    movies[index] = {
      ...movies[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    saveMovies(movies)
  }
}

export function deleteMovie(id: string) {
  const movies = getMovies()
  const filtered = movies.filter((movie) => movie.id !== id)
  saveMovies(filtered)
}

export function calculateTotalMovies(movies: Movie[]): number {
  return movies.length
}

export function calculateTotalRuntime(movies: Movie[]): number {
  return movies.reduce((total, movie) => total + movie.runtime, 0)
}

export function calculateAverageRating(movies: Movie[]): number {
  if (movies.length === 0) return 0
  const total = movies.reduce((sum, movie) => sum + movie.rating, 0)
  return Number((total / movies.length).toFixed(1))
}

export function calculateMoviesThisYear(movies: Movie[]): number {
  const currentYear = new Date().getFullYear()
  return movies.filter((movie) => {
    if (!movie.dateWatched) return false
    return new Date(movie.dateWatched).getFullYear() === currentYear
  }).length
}
